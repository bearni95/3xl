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
-- precisely what the limit exists to stop. Its other half is the open battle
-- (battles.sql): the day stops them coming back to this town, and the battle row
-- stops them going anywhere else while this fight is unfinished.
--
-- The one thing that gives a spent day back is the town changing hands underneath
-- an open fight. A challenger who started against one team and had it taken by
-- somebody else mid-fight never got the fight they paid for — the team they are
-- beating no longer sits there, and their win is going to be refused as stale
-- (see combat_results.sql). Capturing a town therefore VOIDS every challenge
-- still open against the generation it just ended, and a voided slot no longer
-- blocks: `start_battle` revives it, so those players may come straight back at
-- the new occupant the same day (once they have finished the fight they are in).
-- Voiding rather than deleting is what makes the refund survive their late report
-- — a deleted row would simply be recreated, settled, by the report that arrives
-- when their fight finally ends.
--
-- Because the frontend talks to Supabase directly with the anon key, the rule
-- lives in the database, not the client: `municipality_challenges` has no client
-- write policy at all, and the only two writers are
--   * `start_battle` (battles.sql), which claims the day's slot in the same
--     transaction that opens the battle, so the day is never spent on a fight that
--     failed to start — and never spent without a battle to answer for it;
--   * `award_combat_exp` (combat_results.sql), which settles that slot when the
--     fight is reported — and rejects the report outright, experience included,
--     if the town's slot for today was already settled by an earlier fight. It is
--     also what voids the open slots of everyone else when a fight takes the town.
-- Neither one can be skipped for advantage: a report is only accepted against an
-- open battle, and a battle can only be opened by spending the day.
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
	-- but never fought — it no longer blocks, and start_battle revives it in
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

-- The slot is claimed by `start_battle` and settled by `award_combat_exp`, both of
-- which live elsewhere: the claim belongs with the battle it opens (battles.sql)
-- and the settle with the award it gates (combat_results.sql). There is no RPC of
-- its own here, and deliberately so — a challenge that could be spent without a
-- battle being opened would be a day spent with nothing holding the player to the
-- fight.
