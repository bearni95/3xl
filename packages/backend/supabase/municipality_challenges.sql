-- One challenge per town per day: the server-side enforcement behind the map's
-- Challenge button.
--
-- Fighting for a town is the whole progression loop, and taking one that has
-- changed hands takes as many wins as it has flipped, plus one (see
-- municipality_holders.sql). That bar only means anything if a player cannot
-- simply refight the same town until the wins land — so a player may challenge
-- each municipality **once per Catalan day**, the day resetting at midnight
-- Europe/Madrid exactly as the booster allowance does (see booster_claims.sql).
--
-- The day is spent the moment the fight opens, not when it is reported: a fight
-- abandoned halfway still used that town's challenge. Otherwise a player could
-- close the arena on a fight that was going badly and start it again, which is
-- precisely what the limit exists to stop.
--
-- The one thing that gives a spent day back is the town changing hands underneath
-- an open fight. A challenger who started against one team and had it taken by
-- somebody else mid-fight never got the fight they paid for — the team they are
-- beating no longer sits there, and their win is going to be refused as stale
-- (see combat_results.sql). Capturing a town therefore VOIDS every challenge
-- still open against the generation it just ended, and a voided slot no longer
-- blocks: `start_challenge` revives it, so those players may come straight back
-- at the new occupant the same day. Voiding rather than deleting is what makes
-- the refund survive their late report — a deleted row would simply be recreated,
-- settled, by the report that arrives when their fight finally ends.
--
-- Because the frontend talks to Supabase directly with the anon key, the rule
-- lives in the database, not the client: `municipality_challenges` has no client
-- write policy at all, and the only two writers are
--   * `start_challenge` here, which claims the day's slot before the arena opens;
--   * `award_combat_exp` (combat_results.sql), which settles that slot when the
--     fight is reported — and rejects the report outright, experience included,
--     if the town's slot for today was already settled by an earlier fight. It is
--     also what voids the open slots of everyone else when a fight takes the town.
-- A client that skips start_challenge therefore gains nothing: its first report
-- claims and settles the slot in one go, and its second is refused.
--
-- @3xl/backend provisions all of this automatically alongside the other tables
-- (see ../src/routes/show-templates.ts), so you normally do NOT need to run this
-- file — it's kept for reference and for provisioning by hand.
--
-- Idempotent: safe to re-run.

-- One row per (player, town, Catalan day): the day's challenge, spent. The
-- primary key IS the limit — a row existing for today, and not voided, means the
-- town has been fought today, whatever the outcome was, or whether there was one
-- at all. A player reads only their own rows, which is all the map needs to grey
-- out the towns they have already been to today.
create table if not exists public.municipality_challenges (
	user_id uuid not null references auth.users (id) on delete cascade,
	-- The town, as its geojson feature id (e.g. ES_08028).
	location_id text not null,
	-- The Catalan (Europe/Madrid) date the challenge was spent on.
	challenge_date date not null default (now() at time zone 'Europe/Madrid')::date,
	started_at timestamptz not null default now(),
	-- When the fight was reported, or null while it is still open (started and
	-- never finished). The day is spent either way; this only tells
	-- award_combat_exp whether a report against this slot is the first one.
	settled_at timestamptz,
	-- When this slot was handed back because the town changed hands while the fight
	-- was still open, or null for the normal case. A voided slot has been paid for
	-- but never fought — it no longer blocks, and start_challenge revives it in
	-- place. It is kept (rather than deleted) so the late report of the fight it
	-- belonged to settles this row instead of claiming a fresh one.
	voided_at timestamptz,
	primary key (user_id, location_id, challenge_date)
);

-- Slots predating the refund were never voided, so the column simply arrives null.
alter table public.municipality_challenges add column if not exists voided_at timestamptz;

alter table public.municipality_challenges enable row level security;

drop policy if exists municipality_challenges_select_own on public.municipality_challenges;
create policy municipality_challenges_select_own on public.municipality_challenges
	for select using (auth.uid() = user_id);

-- Spend today's challenge on a town, called when the arena opens. Claims the
-- day's slot atomically and raises when it is already taken — so two tabs cannot
-- both start a fight for the same town on the same day. Refuses a town the caller
-- already holds, matching award_combat_exp: there is nothing to take off yourself.
-- security definer: the table has no client write policy.
--
-- A slot voided by somebody taking the town mid-fight is revived rather than
-- refused: the row is reset to a fresh, unsettled, unvoided challenge, which is
-- the one extra fight that capture bought the challenger. The revived slot blocks
-- again exactly as a first one does, so each capture is worth one attempt, not an
-- open door.
--
-- The OUT parameter names deliberately avoid the table's column names — plpgsql
-- would otherwise have to disambiguate them against the insert.
create or replace function public.start_challenge(p_location_id text)
returns table (town_id text, challenge_day date, opened_at timestamptz)
language plpgsql security definer set search_path = public as $$
declare
	v_uid uuid := auth.uid();
	v_today date := (now() at time zone 'Europe/Madrid')::date;
	v_holder uuid;
	v_started timestamptz;
begin
	if v_uid is null then
		raise exception 'You must be signed in to challenge a town.';
	end if;
	if p_location_id is null or p_location_id = '' then
		raise exception 'A town is required to start a challenge.';
	end if;

	-- Serialise this player's mutations, matching claim_booster / award_combat_exp.
	perform pg_advisory_xact_lock(hashtextextended(v_uid::text, 0));

	select h.user_id into v_holder from public.municipality_holders h
		where h.location_id = p_location_id;
	if v_holder is not null and v_holder = v_uid then
		raise exception 'You already hold this town — you cannot challenge your own team.';
	end if;

	insert into public.municipality_challenges (user_id, location_id, challenge_date)
		values (v_uid, p_location_id, v_today)
		on conflict (user_id, location_id, challenge_date) do update
			set started_at = now(), settled_at = null, voided_at = null
			where municipality_challenges.voided_at is not null
		returning municipality_challenges.started_at into v_started;
	if v_started is null then
		raise exception 'You have already challenged this town today. New challenges at midnight.';
	end if;

	town_id := p_location_id;
	challenge_day := v_today;
	opened_at := v_started;
	return next;
end;
$$;

grant execute on function public.start_challenge(text) to authenticated;
