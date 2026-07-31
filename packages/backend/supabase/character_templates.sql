-- Character templates: the minimal, frontend-facing identity of each playable
-- character, mirrored from the local @3xl/data registry into Supabase.
--
-- @3xl/backend creates this table automatically on first use (it connects
-- directly to Postgres with the DB password), so you normally do NOT need to
-- run this file — it's kept for reference and for provisioning the table by
-- hand. The local JSON registry is the source of truth; the admin /characters
-- screen pushes it here via POST /api/character-templates/sync. Only the stable
-- id and the display name (the registry `label`) are stored.
--
-- Idempotent: safe to re-run.

create table if not exists public.character_templates (
	id text primary key,
	name text not null,
	updated_at timestamptz not null default now()
);

-- Rarity tier, authored from the admin and Supabase-only: the local registry
-- never writes it, which is why it is added rather than declared above.
alter table public.character_templates
	add column if not exists rarity integer not null default 0;

-- World-readable, client-writable by nobody. RLS off would not have made this
-- table private but public with every verb -- Supabase's default privileges
-- grant anon and authenticated everything on a table in an exposed schema --
-- and `rarity` is a draw weight claim_booster rolls against, so an anon key
-- that could update it could retier itself a legendary. The admin sync writes
-- as the owning role, which RLS does not apply to.
alter table public.character_templates enable row level security;
drop policy if exists character_templates_select_all on public.character_templates;
create policy character_templates_select_all on public.character_templates
	for select using (true);
