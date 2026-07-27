-- Festivity calendar: every municipality's local-holiday dates, mirrored from
-- the local baked calendar (@3xl/data's public/festes-locals.json) into two
-- normalized, FK-related Supabase tables. The admin /seasons screen pushes the
-- window from today through the calendar year's end via
-- POST /api/festivities/sync.
--
-- @3xl/backend creates both tables automatically on first use (it connects
-- directly to Postgres with the DB password), so you normally do NOT need to
-- run this file — it's kept for reference and for provisioning by hand. The
-- local JSON calendar is the source of truth.
--
-- Idempotent: safe to re-run.

-- The location entity: one row per municipality, keyed by its geo feature id.
create table if not exists public.festa_locations (
	id text primary key,
	name text not null,
	comarca text,
	prov text,
	territory text,
	updated_at timestamptz not null default now()
);

-- One row per (location, date). Foreign-keyed to festa_locations; deleting a
-- location cascades to its festivities. No location attributes are duplicated
-- here — that is what the FK is for.
create table if not exists public.festivities (
	id bigserial primary key,
	location_id text not null references public.festa_locations(id) on delete cascade,
	date date not null,
	year integer not null,
	updated_at timestamptz not null default now(),
	unique (location_id, date)
);

create index if not exists festivities_date_idx on public.festivities (date);
create index if not exists festivities_location_idx on public.festivities (location_id);
