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
	created_at timestamptz not null default now()
);

-- Backfill the column on tables provisioned before location tracking existed.
alter table public.character_spawns add column if not exists location_id text;

-- Row-level security: a player may only read, create, and delete their own
-- spawns. `auth.uid()` resolves from the caller's JWT (the browser anon client
-- sends the signed-in user's token).
alter table public.character_spawns enable row level security;

drop policy if exists character_spawns_select_own on public.character_spawns;
create policy character_spawns_select_own on public.character_spawns
	for select using (auth.uid() = user_id);

drop policy if exists character_spawns_insert_own on public.character_spawns;
create policy character_spawns_insert_own on public.character_spawns
	for insert with check (auth.uid() = user_id);

drop policy if exists character_spawns_delete_own on public.character_spawns;
create policy character_spawns_delete_own on public.character_spawns
	for delete using (auth.uid() = user_id);
