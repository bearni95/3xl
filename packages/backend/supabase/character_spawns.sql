-- Character spawns: per-player claimed instances of a character. Each row links
-- a Supabase auth user to a character template (and the show it was rolled from)
-- and is created by the frontend /claim panel, where a signed-in player spawns a
-- random character drawn from a show's assigned roster (`show_characters`).
--
-- Unlike the other template tables, this one is written directly by the frontend
-- with the anon key (RLS-gated), not by @3xl/backend. @3xl/backend still creates
-- it automatically alongside `show_templates`/`show_characters` (see
-- ../src/routes/show-templates.ts), so you normally do NOT need to run this file
-- — it's kept for reference and for provisioning the table by hand.
--
-- Idempotent: safe to re-run.

create table if not exists public.character_spawns (
	id uuid primary key default gen_random_uuid(),
	user_id uuid not null references auth.users (id) on delete cascade,
	character_id text not null references public.character_templates (id) on delete cascade,
	show_id bigint references public.show_templates (id) on delete set null,
	-- Municipality the spawn was claimed in, as a geojson feature id (e.g. ES_08028)
	-- resolved from the player's browser location. The frontend requires it on claim.
	location_id text,
	-- Weighted spawn colour (red/yellow/blue common; orange/green/purple 3x rarer).
	color text,
	created_at timestamptz not null default now()
);

-- Backfill the columns on tables provisioned before they existed.
alter table public.character_spawns add column if not exists location_id text;
alter table public.character_spawns add column if not exists color text;

-- A claimed card once carried a rolled 1..9 gameplay stat as well. Nothing reads it
-- any more — a fighter's colour is the whole of what it brings to a fight — so the
-- column goes, along with the range check that guarded it.
alter table public.character_spawns drop constraint if exists character_spawns_stat_range;
alter table public.character_spawns drop column if exists stat;

-- Assign a weighted colour to any pre-existing rows that lack one.
update public.character_spawns cs set color = pick.color
from (
	select id, case
		when r < 3.0 / 12 then 'red'
		when r < 6.0 / 12 then 'yellow'
		when r < 9.0 / 12 then 'blue'
		when r < 10.0 / 12 then 'orange'
		when r < 11.0 / 12 then 'green'
		else 'purple'
	end as color
	from (select id, random() as r from public.character_spawns where color is null) seeded
) pick
where cs.id = pick.id;

-- Row-level security: a player may read and delete their own spawns. `auth.uid()`
-- resolves from the caller's JWT (the browser anon client sends the signed-in
-- user's token).
--
-- There is deliberately NO insert policy: spawns are created only by the
-- `claim_booster` security-definer RPC (see booster_claims.sql), which enforces
-- the daily limit and the festa-major-today rule server-side. A client holding
-- the anon key therefore cannot insert arbitrary spawns — only earn them through
-- a valid claim. (Earlier revisions had a `character_spawns_insert_own` policy;
-- it is dropped there.)
alter table public.character_spawns enable row level security;

drop policy if exists character_spawns_select_own on public.character_spawns;
create policy character_spawns_select_own on public.character_spawns
	for select using (auth.uid() = user_id);

drop policy if exists character_spawns_insert_own on public.character_spawns;

drop policy if exists character_spawns_delete_own on public.character_spawns;
create policy character_spawns_delete_own on public.character_spawns
	for delete using (auth.uid() = user_id);
