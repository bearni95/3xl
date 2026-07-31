-- One fight per town at a time, and an hour before the next one: the server-side
-- enforcement behind the map's Challenge button.
--
-- Fighting for a town is the whole progression loop, and taking one that has
-- changed hands takes as many wins as it has flipped, plus one (see
-- municipality_holders.sql). That bar only means anything if a player cannot
-- simply refight the same town until the wins land — so a finished fight puts
-- that town on a **cooldown** for the player who fought it, and they may come
-- straight back the moment it runs out.
--
-- The cooldown is one hour (`challenge_cooldown()` below is the only place that
-- number is written down, on either side of the wire — the browser is handed the
-- deadline, never the duration), and it is timed from the moment the fight is
-- **reported**, not from the moment it opened. A fight is not a wait: whether it
-- took two minutes or was left standing for an afternoon, the town shuts for the
-- same hour once it is over, and the clock does not start ticking underneath a
-- fight still being played.
--
-- Nothing needs to block while that fight is open, because the open battle
-- already does (battles.sql): one battle per player, ever, and it has to be
-- reported before another can be opened. So the two halves are clean — the
-- battle row stops a player going anywhere else while this fight is unfinished,
-- and the cooldown stops them coming back to this town the moment it ends.
-- Walking out of a fight that is going badly buys nothing either way: the battle
-- is still there and still the only one they may play, and it is still the fight
-- they have to report before this town, or any other, is offered again.
--
-- The one thing that gives back the wait is the town changing hands underneath an
-- open fight. A challenger who started against one team and had it taken by
-- somebody else mid-fight never got the fight they came for — the team they are
-- beating no longer sits there, and their win is going to be refused as stale
-- (see combat_results.sql). Capturing a town therefore VOIDS every challenge
-- still open against the generation it just ended, and a voided challenge settles
-- with no cooldown at all: those players may come back at the new occupant as
-- soon as they are out of the fight they are in. Voiding rather than deleting is
-- what makes that survive their late report — a deleted row would simply be
-- recreated, cooldown and all, by the report that arrives when their fight
-- finally ends.
--
-- Because the frontend talks to Supabase directly with the anon key, the rule
-- lives in the database, not the client: `municipality_challenges` has no client
-- write policy at all, and the only two writers are
--   * `start_battle` (battles.sql), which claims the town's slot in the same
--     transaction that opens the battle — so a challenge always has a battle to
--     answer for it — and refuses outright while the town is still cooling down;
--   * `award_combat_exp` (combat_results.sql), which settles that slot when the
--     fight is reported and is where the cooldown is set. It is also what voids
--     the open slots of everyone else when a fight takes the town.
-- Neither one can be skipped for advantage: a report is only accepted against an
-- open battle, and a battle can only be opened by claiming the town.
--
-- @3xl/backend provisions all of this automatically alongside the other tables
-- (see ../src/routes/show-templates.ts), so you normally do NOT need to run this
-- file — it's kept for reference and for provisioning by hand.
--
-- Idempotent: safe to re-run.

-- How long a town stays shut to the player who just fought it. One number, in one
-- place: `start_battle` refuses against the deadline this produced, the browser
-- draws the countdown off that same deadline, and nothing anywhere else names an
-- hour. Immutable so it can be inlined wherever it is called.
create or replace function public.challenge_cooldown()
returns interval language sql immutable set search_path = public as $$
	select interval '1 hour';
$$;

grant execute on function public.challenge_cooldown() to authenticated;

-- One row per (player, town): that player's current or most recent challenge on
-- that town, and the wait it left behind. What limits anything is `available_at` —
-- until that instant passes, `start_battle` will not open another fight over the
-- town for this player, whatever the last one's outcome was or whether it was ever
-- finished.
create table if not exists public.municipality_challenges (
	user_id uuid not null references auth.users (id) on delete cascade,
	-- The town, as its geojson feature id (e.g. ES_08028).
	location_id text not null,
	started_at timestamptz not null default now(),
	-- When the fight was reported, or null while it is still open (started and
	-- never finished). Settling is what starts the cooldown, so these two columns
	-- are written together and mean nothing apart.
	settled_at timestamptz,
	-- When the town opens up again: the settle plus challenge_cooldown(). Null
	-- while the fight is still open — the wait has nothing to be measured from yet
	-- — and null on a voided slot, which is a wait handed back.
	available_at timestamptz,
	-- When this slot was handed back because the town changed hands while the fight
	-- was still open, or null for the normal case. A voided slot has been fought for
	-- nothing: it settles with no cooldown, and is kept (rather than deleted) so the
	-- late report of the fight it belonged to settles this row instead of opening a
	-- fresh one that would carry the hour it was excused.
	voided_at timestamptz,
	primary key (user_id, location_id)
);

alter table public.municipality_challenges add column if not exists voided_at timestamptz;
alter table public.municipality_challenges add column if not exists available_at timestamptz;

-- The ledger was once keyed by the Catalan day, one row per (player, town, day),
-- and the mere existence of today's row was the limit. A cooldown is not a day, so
-- the row it needs is the player's *latest* challenge on the town: collapse each
-- (player, town) to its most recent row and re-key onto the pair. Every surviving
-- row keeps a null available_at, which reads as a wait already over — right for
-- rows from a day that had already turned, and an hour's grace at worst for one
-- fought in the minutes before this ran.
do $$
begin
	if exists (
		select 1 from information_schema.columns
		where table_schema = 'public'
			and table_name = 'municipality_challenges'
			and column_name = 'challenge_date'
	) then
		delete from public.municipality_challenges older
			using public.municipality_challenges newer
			where older.user_id = newer.user_id
				and older.location_id = newer.location_id
				-- ctid breaks a tie on the timestamp, so exactly one row survives
				-- each pair however the old rows happen to be stamped.
				and (older.started_at, older.ctid) < (newer.started_at, newer.ctid);
		alter table public.municipality_challenges
			drop constraint if exists municipality_challenges_pkey;
		alter table public.municipality_challenges drop column challenge_date;
		alter table public.municipality_challenges
			add primary key (user_id, location_id);
	end if;
end $$;

-- Capturing a town voids every open challenge on it, which is the one read that
-- goes by town rather than by player — the primary key leads with the player, so
-- it is no help there. Matches municipality_sieges, which is walked the same way
-- at the same moment.
create index if not exists municipality_challenges_location_idx
	on public.municipality_challenges (location_id);

alter table public.municipality_challenges enable row level security;

drop policy if exists municipality_challenges_select_own on public.municipality_challenges;
create policy municipality_challenges_select_own on public.municipality_challenges
	for select using (auth.uid() = user_id);

-- What the map reads: the challenges that are still closing a town off, which is
-- the only thing a client has any use for. A player accumulates a row per town
-- they have ever fought and at most a handful are ever running, so the view is
-- what keeps the map's read small — and, more to the point, it is the SERVER
-- deciding which are still running. A browser filtering on its own clock could
-- talk itself into offering a fight the RPC would refuse.
--
-- security_invoker so the table's own RLS applies: a player sees their own rows
-- and nobody else's, exactly as they do reading the table directly.
create or replace view public.municipality_challenges_open
	with (security_invoker = true) as
	select c.user_id, c.location_id, c.started_at, c.settled_at, c.available_at
	from public.municipality_challenges c
	where c.voided_at is null
		and (c.settled_at is null or c.available_at > now());

-- Granted to anon as well as authenticated, and it gives nothing away: the base
-- table's RLS runs as the caller, so a signed-out reader selects zero rows. The map
-- asks for this before it knows whether anybody is signed in, and an empty answer
-- is the truthful one — a permission error would only be noise it has to swallow.
grant select on public.municipality_challenges_open to anon, authenticated;

-- The slot is claimed by `start_battle` and settled by `award_combat_exp`, both of
-- which live elsewhere: the claim belongs with the battle it opens (battles.sql)
-- and the settle with the award it gates (combat_results.sql). There is no RPC of
-- its own here, and deliberately so — a challenge that could be claimed without a
-- battle being opened would be a town shut with nothing holding the player to the
-- fight.
