-- Territory: who actually occupies each municipality on the map.
--
-- Every town starts on the deterministic "OG" house team the client rolls from
-- the town's own geometry (see @3xl/shared utils/spawn/municipality-team) —
-- nothing is stored for it, and every player sees the same one. The moment a
-- player beats that team enough times the town changes hands: a
-- `municipality_holders` row appears and from then on it is the source of truth.
-- The map shows THAT team and the next challenger fights it; the seed is left
-- only as the fallback for towns nobody has taken yet.
--
-- Taking a town gets harder every time it changes hands. `turnover` counts the
-- flips (1 the first time a player takes it off the OG team), and dethroning the
-- sitting team takes `turnover + 1` wins — one for an untouched town, two for one
-- taken once, three for one taken twice, and so on. A challenger's progress
-- towards that lives in `municipality_sieges`, scoped to the generation the wins
-- were earned against, so a town flipping voids every siege on it.
--
-- Both tables are written ONLY by the `award_combat_exp` security-definer RPC
-- (see combat_results.sql), which settles territory in the same transaction as
-- the experience award. There is no client write path: the browser reports which
-- town it fought and which generation it fought, never a win count, a bar to
-- clear, or an occupant.
--
-- @3xl/backend provisions all of this automatically alongside the other tables
-- (see ../src/routes/show-templates.ts), so you normally do NOT need to run this
-- file — it's kept for reference and for provisioning by hand.
--
-- Idempotent: safe to re-run.

-- One row per taken town. World-readable: the map has to name every town's
-- occupant to every visitor, signed in or not.
create table if not exists public.municipality_holders (
	-- The town, as its geojson feature id (e.g. ES_08028).
	location_id text primary key,
	user_id uuid not null references auth.users (id) on delete cascade,
	-- The winning team frozen as [{"character_id": text, "color": text}, …] in
	-- fielded order. A flat copy, not `character_spawns` references: those rows are
	-- RLS-scoped to their owner, so no other player could read them — and the
	-- occupying team must be visible to everyone. It also pins the garrison as it
	-- won the town, whatever the holder later does with the cards.
	team jsonb not null default '[]'::jsonb,
	-- How many times the town has changed hands. Also the bar for the next
	-- challenger: taking it needs turnover + 1 wins.
	turnover integer not null default 1,
	taken_at timestamptz not null default now()
);

-- The holder's name is NOT kept here. It used to be copied in when the town was
-- taken, which made this a second place a username lived: it went stale the moment
-- the holder renamed themselves, and being written by a trigger-like copy it was
-- also where a name nobody typed could arrive. A username has one home,
-- `player_profiles.username`, and the map reads it live through the view below.
alter table public.municipality_holders drop column if exists holder_name;

alter table public.municipality_holders enable row level security;

drop policy if exists municipality_holders_select_all on public.municipality_holders;
create policy municipality_holders_select_all on public.municipality_holders
	for select using (true);

-- What the map actually selects: every taken town with its holder's current name
-- and the avatar they are wearing joined on. `holder_name` is null for a holder who
-- has not named themselves, and the frontend words that itself (see
-- territory.adapter) — the absence is never filled in with their email or anything
-- else about their sign-in.
--
-- The avatar comes over as the pair that IS one — the character and the colour
-- together (see player_profiles.sql) — so the face on a town's pin is the very face
-- that player's profile card wears, and half of it says nothing on its own. Both
-- null is the initial-letter avatar every account starts on, which the pin draws off
-- the name it already has.
create or replace view public.municipality_holders_public
	with (security_invoker = false) as
	select h.location_id, h.user_id, n.username as holder_name, h.team, h.turnover, h.taken_at,
		n.avatar_character_id, n.avatar_color
	from public.municipality_holders h
	left join public.player_profiles n on n.user_id = h.user_id;

grant select on public.municipality_holders_public to anon, authenticated;

-- One challenger's progress against one town's sitting team. `turnover` is the
-- holder generation the wins count against; when the town flips, the rows are
-- deleted outright (and any that survived would be ignored on the mismatch).
-- A player reads only their own progress.
create table if not exists public.municipality_sieges (
	location_id text not null,
	user_id uuid not null references auth.users (id) on delete cascade,
	wins integer not null default 0,
	turnover integer not null default 0,
	updated_at timestamptz not null default now(),
	primary key (location_id, user_id)
);

create index if not exists municipality_sieges_location_idx
	on public.municipality_sieges (location_id);

alter table public.municipality_sieges enable row level security;

drop policy if exists municipality_sieges_select_own on public.municipality_sieges;
create policy municipality_sieges_select_own on public.municipality_sieges
	for select using (auth.uid() = user_id);
