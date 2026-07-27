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
--   * That span is scaled linearly by the compound HP the player's team is left
--     with: (sum of hp_left) / (sum of max_hp). A flawless win — no damage taken
--     on any fighter — earns the entire span, i.e. exactly one level's worth from
--     the base of the level; a win at half health earns half of it; a win scraped
--     through at 1 HP earns almost nothing.
--   * At level 20 the span is 0, so a maxed player earns nothing further.
--
-- Combat itself runs in the browser (PixiJS board + combat controller), so it
-- cannot be replayed here. The report is therefore treated as a *claim* and
-- bounded rather than trusted:
--
--   * Every spawn in it must be one of the caller's own `character_spawns` rows;
--     a report naming a spawn the caller doesn't own is rejected outright.
--   * Each fighter's max_hp is not read from the report at all: the HP pool is
--     exactly that spawn's HP attribute (DEF + 1, DEF being the stat's
--     complement), so it is re-derived here, and hp_left is clamped to [0, that
--     max]. An inflated pool therefore buys nothing.
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
	-- Compound team HP at the end / at the start, after server-side clamping.
	hp_left integer not null,
	hp_max integer not null,
	-- The level whose span was at stake, and the span itself.
	level integer not null,
	level_span bigint not null,
	-- Experience actually awarded (0 for anything but a win).
	exp_awarded bigint not null,
	fought_at timestamptz not null default now()
);

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
-- {"spawn_id": uuid, "hp_left": number, "max_hp": number}. Returns what was
-- awarded and the state that produced it, so the endgame screen can explain the
-- number. security definer: it writes player_profiles and combat_results, neither
-- of which the anon key may write.
--
-- `p_location_id` names the town the fight was picked over on the map (null for a
-- fight with nothing at stake) and `p_holder_turnover` is the town's turnover as
-- the browser saw it when the fight started. A win then banks one siege win
-- against that town's sitting team, and taking the town — turnover + 1 wins —
-- rewrites municipality_holders with the winner and the team they won with, wipes
-- every siege on it, and raises the bar for the next challenger. A fight against a
-- generation that has since been superseded banks nothing and comes back flagged
-- `town_stale`. See municipality_holders.sql.
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
	team_hp_left int,
	team_hp_max int,
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
	v_reported int;
	v_distinct int;
	v_owned int;
	v_exp bigint;
	v_level int;
	v_span bigint;
	v_hp_left int;
	v_hp_max int;
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

	-- The reported team, bounded against what the caller actually owns. The HP pool
	-- is re-derived rather than trusted: it is exactly the spawn's HP attribute
	-- (DEF + 1, DEF = the stat's complement clamped to 1..9), and the reported
	-- hp_left is then clamped to [0, that].
	with reported as (
		select f.spawn_id, f.hp_left, f.max_hp
		from jsonb_to_recordset(p_fighters)
			as f(spawn_id uuid, hp_left numeric, max_hp numeric)
	),
	owned as (
		select
			r.hp_left,
			(greatest(1, least(9, 10 - cs.stat)) + 1) as hp_pool
		from reported r
		join public.character_spawns cs on cs.id = r.spawn_id and cs.user_id = v_uid
	),
	bounded as (
		select
			o.hp_pool as capped_max,
			coalesce(o.hp_left, 0) as raw_left
		from owned o
	)
	select
		(select count(*) from reported),
		(select count(distinct spawn_id) from reported),
		(select count(*) from owned),
		coalesce((select sum(capped_max) from bounded), 0)::int,
		coalesce((select sum(least(greatest(raw_left, 0), capped_max)) from bounded), 0)::int
	into v_reported, v_distinct, v_owned, v_hp_max, v_hp_left;

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

	-- A win earns the level's whole span, scaled by the team's surviving HP; a
	-- loss or a draw earns nothing.
	if p_outcome = 'win' and v_span > 0 and v_hp_max > 0 then
		v_award := round(v_span::numeric * v_hp_left::numeric / v_hp_max::numeric);
	else
		v_award := 0;
	end if;

	insert into public.combat_results
		(user_id, outcome, hp_left, hp_max, level, level_span, exp_awarded)
		values (v_uid, p_outcome, v_hp_left, v_hp_max, v_level, v_span, v_award);

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
		-- No row at all means the town is still on its seeded OG team: turnover 0.
		v_turnover := coalesce(v_turnover, 0);
		v_required := greatest(1, v_turnover + 1);
		-- The browser fought whatever team it had loaded; if the town has flipped
		-- since, that was not the sitting team and the win buys no ground.
		v_stale := coalesce(p_holder_turnover, 0) <> v_turnover;

		if p_outcome = 'win' and not v_stale and v_holder is distinct from v_uid then
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
							'color', cs.color,
							'stat', cs.stat
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
				v_captured := true;
				v_turnover := v_turnover + 1;
				v_wins := v_required;
			end if;
		else
			-- Nothing banked (a loss, a draw, a stale fight, or the player's own town):
			-- report the progress they already had against this generation.
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
	team_hp_left := v_hp_left;
	team_hp_max := v_hp_max;
	return next;
end;
$$;

grant execute on function public.award_combat_exp(text, jsonb, text, int) to authenticated;
