-- Show templates + character assignments: the minimal, frontend-facing identity
-- of each saved TV show, mirrored from the local @3xl/data public/shows.json
-- collection into Supabase, plus the many-to-many join that assigns characters
-- to shows.
--
-- @3xl/backend creates these tables automatically on first use (it connects
-- directly to Postgres with the DB password), so you normally do NOT need to
-- run this file — it's kept for reference and for provisioning by hand. The
-- local shows.json is the source of truth for templates; the admin /shows screen
-- pushes it here via POST /api/show-templates/sync. Character assignments live
-- only here and are edited from the /shows "Cast" tab.
--
-- Idempotent: safe to re-run.

create table if not exists public.show_templates (
	id bigint primary key,
	name text not null,
	updated_at timestamptz not null default now()
);

-- Join table: a show has many characters, a character appears in many shows.
-- Both sides cascade-delete so removing a show or character cleans up its links.
create table if not exists public.show_characters (
	show_id bigint not null references public.show_templates (id) on delete cascade,
	character_id text not null references public.character_templates (id) on delete cascade,
	primary key (show_id, character_id)
);

-- Both world-readable, client-writable by nobody. RLS off would not have made
-- these private but public with every verb -- Supabase's default privileges
-- grant anon and authenticated everything on a table in an exposed schema --
-- and the join below IS the booster draw pool: claim_booster rolls over the
-- characters assigned to the claimed show, so a client able to insert here
-- would choose what it pulls. The admin sync writes as the owning role, which
-- RLS does not apply to.
alter table public.show_templates enable row level security;
drop policy if exists show_templates_select_all on public.show_templates;
create policy show_templates_select_all on public.show_templates
	for select using (true);

alter table public.show_characters enable row level security;
drop policy if exists show_characters_select_all on public.show_characters;
create policy show_characters_select_all on public.show_characters
	for select using (true);
