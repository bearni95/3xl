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
