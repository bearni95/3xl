-- Combat rewards: the ONLY way a player earns experience.
--
-- Fighting is the whole progression loop — claiming cards, opening packs and
-- recycling award nothing. When a fight ends the browser reports it through the
-- `award_combat_exp` security-definer RPC below, which decides the award itself:
--
--   * A loss or a draw earns nothing at all.
--   * A win earns a share of the player's *current level's full span* — the
--     experience between the threshold where that level begins and the one where
--     the next begins (300 at level 1, 600 at level 2, 1800 at level 3, …). The
--     whole span, not just the part not yet earned.
--   * That span is scaled linearly by how much of the player's team is left
--     standing: survivors / fielded. A flawless win — nobody taken down — earns
--     the entire span, i.e. exactly one level's worth from the base of the level;
--     a win with one of three left earns a third of it.
--   * At level 20 the span is 0, so a maxed player earns nothing further.
--
-- Combat itself runs in the browser (PixiJS board + combat controller), so it
-- cannot be replayed here. The report is therefore treated as a *claim* and
-- bounded rather than trusted:
--
--   * Every spawn in it must be one of the caller's own `character_spawns` rows;
--     a report naming a spawn the caller doesn't own is rejected outright.
--   * The team is counted here, not read from the report: at most 3 fighters, each
--     of them the caller's, each named once. A fighter is standing or it is down —
--     there is no health in this game — so the only thing the client states about
--     one is that flag, and the ratio it can inflate is bounded by the team size.
--   * The amount is never sent by the client: it is derived here from the
--     player's *stored* experience, which the client cannot write (player_profiles
--     has no insert/update policy and there is no longer an add_player_exp RPC).
--
-- What remains client-side is the outcome itself and the damage taken — a
-- tampered client can still claim a flawless win it did not earn. Closing that
-- gap needs the fight simulated server-side, which is a separate change.
--
-- The same RPC also settles TERRITORY, in the same transaction, when the fight
-- was picked over a town on the map: a win banks one siege win against that
-- town's sitting team, and enough of them flip the town to the winner. See
-- municipality_holders.sql for the tables and the rules.
--
-- Territory is also where the once-a-day challenge limit is enforced: settling a
-- fight spends that town's challenge for the Catalan day, and a second report
-- against a town already settled today is rejected outright — experience and all.
-- Taking a town is likewise what hands that day back to everyone still fighting
-- for the generation it ended, whose fights it just made unwinnable. See
-- municipality_challenges.sql.
--
-- @3xl/backend provisions all of this automatically alongside the other tables
-- (see ../src/routes/show-templates.ts), so you normally do NOT need to run this
-- file — it's kept for reference and for provisioning by hand.
--
-- Idempotent: safe to re-run.

-- One row per finished fight: the audit trail behind every experience gain, and
-- the only place awards are recorded. Written solely by award_combat_exp; RLS
-- lets a player read only their own fights.
create table if not exists public.combat_results (
	id uuid primary key default gen_random_uuid(),
	user_id uuid not null references auth.users (id) on delete cascade,
	outcome text not null check (outcome in ('win', 'lose', 'draw')),
	-- Fighters left standing at the end / fielded at the start, as counted here.
	survivors integer not null,
	fielded integer not null,
	-- The level whose span was at stake, and the span itself.
	level integer not null,
	level_span bigint not null,
	-- Experience actually awarded (0 for anything but a win).
	exp_awarded bigint not null,
	fought_at timestamptz not null default now()
);

-- Fights recorded while the award was weighed by compound HP carried hp_left/hp_max
-- instead. The two are not the same measure, so the columns are replaced rather than
-- renamed: an old row keeps the award it actually paid (outcome, level, exp_awarded)
-- and reads as 0 of 0 fighters, which is honestly "not recorded" rather than an HP
-- sum wearing a headcount's name.
alter table public.combat_results add column if not exists survivors integer not null default 0;
alter table public.combat_results add column if not exists fielded integer not null default 0;
alter table public.combat_results drop column if exists hp_left;
alter table public.combat_results drop column if exists hp_max;

create index if not exists combat_results_user_day_idx
	on public.combat_results (user_id, fought_at);

alter table public.combat_results enable row level security;

drop policy if exists combat_results_select_own on public.combat_results;
create policy combat_results_select_own on public.combat_results
	for select using (auth.uid() = user_id);

-- Cumulative experience at which `p_level` begins — the D&D 5e table, clamped to
-- 1..20. Keep in sync with DND_LEVEL_THRESHOLDS / expForLevel in @3xl/shared
-- utils/progression/level.ts.
create or replace function public.exp_for_level(p_level int)
returns bigint language sql immutable set search_path = public as $$
	select case least(greatest(p_level, 1), 20)
		when 1 then 0
		when 2 then 300
		when 3 then 900
		when 4 then 2700
		when 5 then 6500
		when 6 then 14000
		when 7 then 23000
		when 8 then 34000
		when 9 then 48000
		when 10 then 64000
		when 11 then 85000
		when 12 then 100000
		when 13 then 120000
		when 14 then 140000
		when 15 then 165000
		when 16 then 195000
		when 17 then 225000
		when 18 then 265000
		when 19 then 305000
		else 355000
	end::bigint;
$$;

-- The full width of a level: the experience between its threshold and the next
-- one. 0 at level 20 (no next threshold). Mirrors levelSpanExp in @3xl/shared.
create or replace function public.level_span_exp(p_level int)
returns bigint language sql immutable set search_path = public as $$
	select case
		when least(greatest(p_level, 1), 20) >= 20 then 0::bigint
		else public.exp_for_level(least(greatest(p_level, 1), 20) + 1)
			- public.exp_for_level(least(greatest(p_level, 1), 20))
	end;
$$;

-- Award experience for one finished fight (see the header for the rules and the
-- trust model). `p_fighters` is the player's side only, as a JSON array of
-- {"spawn_id": uuid, "down": boolean}. Returns what was awarded and the state that
-- produced it, so the endgame screen can explain the number. security definer: it
-- writes player_profiles and combat_results, neither of which the anon key may
-- write.
--
-- `p_location_id` names the town the fight was picked over on the map (null for a
-- fight with nothing at stake) and `p_holder_turnover` is the town's turnover as
-- the browser saw it when the fight started. A win then banks one siege win
-- against that town's sitting team, and taking the town — turnover + 1 wins —
-- rewrites municipality_holders with the winner and the team they won with, wipes
-- every siege on it, and raises the bar for the next challenger. A fight against a
-- generation that has since been superseded banks nothing and comes back flagged
-- `town_stale`. A town the caller already holds cannot be fought for at all — the
-- report is rejected outright, experience included. So is a town the caller has
-- already had a fight settled against today. See municipality_holders.sql and
-- municipality_challenges.sql.
--
-- (The OUT parameter names deliberately avoid the column names used in the body —
-- plpgsql would otherwise have to disambiguate them against the query.)

-- The pre-territory two-argument signature is dropped rather than replaced:
-- leaving it in place would give PostgREST two overloads to choose between and
-- make every rpc('award_combat_exp') call ambiguous.
drop function if exists public.award_combat_exp(text, jsonb);

create or replace function public.award_combat_exp(
	p_outcome text,
	p_fighters jsonb,
	p_location_id text default null,
	p_holder_turnover int default 0
)
returns table (
	awarded_exp bigint,
	total_exp bigint,
	at_level int,
	span_exp bigint,
	team_survivors int,
	team_fielded int,
	-- Territory, all null when the report named no town.
	town_captured boolean,
	town_wins int,
	town_required int,
	town_turnover int,
	town_stale boolean
)
language plpgsql security definer set search_path = public as $$
declare
	v_uid uuid := auth.uid();
	v_today date := (now() at time zone 'Europe/Madrid')::date;
	v_challenge timestamptz;
	v_reported int;
	v_distinct int;
	v_owned int;
	v_exp bigint;
	v_level int;
	v_span bigint;
	v_standing int;
	v_award bigint;
	v_total bigint;
	v_holder uuid;
	v_turnover int;
	v_required int;
	v_wins int;
	v_stale boolean := false;
	v_captured boolean := false;
	v_team jsonb;
	v_name text;
begin
	if v_uid is null then
		raise exception 'You must be signed in to earn experience.';
	end if;
	if p_outcome is null or p_outcome not in ('win', 'lose', 'draw') then
		raise exception 'Unknown combat outcome: %.', coalesce(p_outcome, 'null');
	end if;
	if p_fighters is null or jsonb_typeof(p_fighters) <> 'array' then
		raise exception 'A combat report must list the fighters that took part.';
	end if;

	-- Serialise this player's mutations, matching claim_booster / recycle_spawns.
	perform pg_advisory_xact_lock(hashtextextended(v_uid::text, 0));

	-- The reported team, bounded against what the caller actually owns. A fighter is
	-- standing or it is down, so the survivors are simply counted over the fighters
	-- that turned out to be the caller's own.
	with reported as (
		select f.spawn_id, coalesce(f.down, false) as down
		from jsonb_to_recordset(p_fighters)
			as f(spawn_id uuid, down boolean)
	),
	owned as (
		select r.down
		from reported r
		join public.character_spawns cs on cs.id = r.spawn_id and cs.user_id = v_uid
	)
	select
		(select count(*) from reported),
		(select count(distinct spawn_id) from reported),
		(select count(*) from owned),
		(select count(*) from owned where not down)
	into v_reported, v_distinct, v_owned, v_standing;

	if v_reported = 0 then
		raise exception 'A combat report must list the fighters that took part.';
	end if;
	if v_reported > 3 then
		raise exception 'A team fields at most 3 fighters; % were reported.', v_reported;
	end if;
	if v_distinct <> v_reported then
		raise exception 'A fighter cannot be reported twice.';
	end if;
	if v_owned <> v_reported then
		raise exception 'Every fighter must be one of your own claimed characters.';
	end if;

	-- The level at stake is the one the player is on *now*, before the award.
	select coalesce(exp, 0) into v_exp from public.player_profiles where user_id = v_uid;
	v_exp := coalesce(v_exp, 0);
	v_level := public.level_for_exp(v_exp);
	v_span := public.level_span_exp(v_level);

	-- A win earns the level's whole span, scaled by the share of the team still
	-- standing; a loss or a draw earns nothing.
	if p_outcome = 'win' and v_span > 0 and v_owned > 0 then
		v_award := round(v_span::numeric * v_standing::numeric / v_owned::numeric);
	else
		v_award := 0;
	end if;

	insert into public.combat_results
		(user_id, outcome, survivors, fielded, level, level_span, exp_awarded)
		values (v_uid, p_outcome, v_standing, v_owned, v_level, v_span, v_award);

	if v_award > 0 then
		insert into public.player_profiles (user_id, exp)
			values (v_uid, v_award)
			on conflict (user_id) do update
				set exp = player_profiles.exp + v_award, updated_at = now()
			returning exp into v_total;
	else
		v_total := v_exp;
	end if;

	-- Territory, when this fight was picked over a town on the map.
	if p_location_id is not null and p_location_id <> '' then
		-- Serialise per town, so two challengers finishing at the same moment can't
		-- both read the same turnover and both take it.
		perform pg_advisory_xact_lock(hashtextextended('municipality:' || p_location_id, 0));

		select h.user_id, h.turnover into v_holder, v_turnover
			from public.municipality_holders h where h.location_id = p_location_id;
		-- A town whose sitting team is the caller's own cannot be fought for: there
		-- is nothing to take off yourself. The map never offers the challenge, so a
		-- report that names one did not come from the game — reject it outright,
		-- rolling back the experience with it, rather than paying out for a fight
		-- that should not have happened.
		if v_holder is not null and v_holder = v_uid then
			raise exception 'You already hold this town — you cannot challenge your own team.';
		end if;

		-- One challenge per town per Catalan day (see municipality_challenges.sql).
		-- The slot is normally already open — start_challenge claimed it when the
		-- arena opened — and settling it here closes it. A report against a slot that
		-- is already settled is a second fight against the same town today: reject it
		-- outright, rolling back the experience with it, exactly as a fight against
		-- one's own town is. A report with no slot at all (a client that never called
		-- start_challenge) claims and settles one in the same statement, so skipping
		-- that call buys nothing.
		--
		-- A slot voided below (the town changed hands while this fight was open)
		-- settles here like any other — the fight did happen and is paid for — but
		-- keeps its voided_at, which is what carries the refund past this report:
		-- start_challenge still revives it, so this fight cost its challenger no day.
		-- Settling it is also what bounds the refund, since the revived slot is a
		-- normal one and a stale report cannot be replayed against a settled slot.
		insert into public.municipality_challenges
			(user_id, location_id, challenge_date, settled_at)
			values (v_uid, p_location_id, v_today, now())
			on conflict (user_id, location_id, challenge_date) do update
				set settled_at = now()
				where municipality_challenges.settled_at is null
			returning municipality_challenges.settled_at into v_challenge;
		if v_challenge is null then
			raise exception 'You have already challenged this town today. New challenges at midnight.';
		end if;

		-- No row at all means the town is still on its seeded OG team: turnover 0.
		v_turnover := coalesce(v_turnover, 0);
		v_required := greatest(1, v_turnover + 1);
		-- The browser fought whatever team it had loaded; if the town has flipped
		-- since, that was not the sitting team and the win buys no ground.
		v_stale := coalesce(p_holder_turnover, 0) <> v_turnover;

		if p_outcome = 'win' and not v_stale then
			-- Bank the win. A stored siege from an older generation is not added to —
			-- it restarts at this win, since it was earned against a team that no
			-- longer sits there.
			insert into public.municipality_sieges (location_id, user_id, wins, turnover)
				values (p_location_id, v_uid, 1, v_turnover)
				on conflict (location_id, user_id) do update
					set wins = case
							when municipality_sieges.turnover = excluded.turnover
								then municipality_sieges.wins + 1
							else 1
						end,
						turnover = excluded.turnover,
						updated_at = now()
				returning wins into v_wins;

			if v_wins >= v_required then
				-- The town falls. Freeze the team that won it, in fielded order, copying
				-- each spawn's attributes rather than referencing the (RLS-scoped) row.
				select jsonb_agg(
						jsonb_build_object(
							'character_id', cs.character_id,
							'color', cs.color
						) order by f.ord
					)
					into v_team
					-- Ordinality over the raw elements (a scalar-returning SRF) rather than
					-- over jsonb_to_recordset, whose column-definition list does not combine
					-- with WITH ORDINALITY.
					from (
						select (e.elem->>'spawn_id')::uuid as spawn_id, e.ord
						from jsonb_array_elements(p_fighters) with ordinality as e(elem, ord)
					) f
					join public.character_spawns cs on cs.id = f.spawn_id and cs.user_id = v_uid;

				-- Name the new occupant from their account, so the map never has to read
				-- auth.users from the browser.
				select coalesce(
						nullif(btrim(coalesce(
							u.raw_user_meta_data->>'full_name',
							u.raw_user_meta_data->>'name',
							''
						)), ''),
						split_part(coalesce(u.email, ''), '@', 1)
					)
					into v_name
					from auth.users u where u.id = v_uid;

				insert into public.municipality_holders
					(location_id, user_id, holder_name, team, turnover, taken_at)
					values (p_location_id, v_uid, v_name, coalesce(v_team, '[]'::jsonb),
						v_turnover + 1, now())
					on conflict (location_id) do update
						set user_id = excluded.user_id,
							holder_name = excluded.holder_name,
							team = excluded.team,
							turnover = excluded.turnover,
							taken_at = excluded.taken_at;

				-- A new generation voids every siege on the town, the winner's included.
				delete from public.municipality_sieges where location_id = p_location_id;

				-- It voids every fight still open against the old generation too. Those
				-- challengers started against a team that no longer sits here and their
				-- report, whenever it lands, will be refused as stale — so the day they
				-- spent on this town is handed back rather than burnt on a fight this
				-- capture took away from them. The slot is marked, not deleted: their
				-- late report still settles this row (paying its experience and banking
				-- no ground, exactly as any stale report does), and because the row stays
				-- voided it goes on not blocking, so they may come back at the new
				-- occupant today. start_challenge revives it in place.
				--
				-- Only slots that were still open are given back — a challenger who
				-- already fought and reported here today spent their day on a real fight
				-- against the team that was sitting here at the time.
				update public.municipality_challenges
					set voided_at = now()
					where location_id = p_location_id
						and challenge_date = v_today
						and settled_at is null
						and voided_at is null
						and user_id <> v_uid;
				v_captured := true;
				v_turnover := v_turnover + 1;
				v_wins := v_required;
			end if;
		else
			-- Nothing banked (a loss, a draw or a stale fight): report the progress
			-- they already had against this generation.
			select s.wins into v_wins from public.municipality_sieges s
				where s.location_id = p_location_id
					and s.user_id = v_uid
					and s.turnover = v_turnover;
			v_wins := coalesce(v_wins, 0);
		end if;

		town_captured := v_captured;
		town_wins := v_wins;
		town_required := v_required;
		town_turnover := v_turnover;
		town_stale := v_stale;
	end if;

	awarded_exp := v_award;
	total_exp := coalesce(v_total, v_exp);
	at_level := v_level;
	span_exp := v_span;
	team_survivors := v_standing;
	team_fielded := v_owned;
	return next;
end;
$$;

grant execute on function public.award_combat_exp(text, jsonb, text, int) to authenticated;
