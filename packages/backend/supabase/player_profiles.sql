-- Player profiles: per-player progression state, keyed by the Supabase auth user.
-- Today it holds a single accumulated `exp` total; the frontend reads it and
-- derives a level from the D&D 5e experience table (see @3xl/shared's
-- utils/progression/level.ts). The profile card in the navbar shows both.
--
-- Like `character_spawns`, this is player-owned and RLS-gated. But unlike the
-- spawns table it is NOT written directly by the frontend: the only mutation path
-- is the `add_player_exp` RPC below, a security-definer function that increments
-- the total atomically. There is deliberately no insert/update policy, so a
-- client holding the anon key can read its own total and earn increments through
-- the RPC, but cannot set an arbitrary value.
--
-- @3xl/backend creates this table and function automatically alongside the other
-- tables (see ../src/routes/show-templates.ts), so you normally do NOT need to
-- run this file — it's kept for reference and for provisioning by hand.
--
-- Idempotent: safe to re-run.

create table if not exists public.player_profiles (
	user_id uuid primary key references auth.users (id) on delete cascade,
	-- Accumulated experience. Starts at 0; only ever increased via add_player_exp.
	exp bigint not null default 0,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

-- Row-level security: a player may read only their own row. No insert/update
-- policy — mutation happens exclusively through the security-definer RPC below.
alter table public.player_profiles enable row level security;

drop policy if exists player_profiles_select_own on public.player_profiles;
create policy player_profiles_select_own on public.player_profiles
	for select using (auth.uid() = user_id);

-- Atomically award experience to the calling user: upsert their row and add
-- `amount` (clamped to be non-negative) to the stored total. Runs as the table
-- owner (security definer), so it can write despite the read-only RLS policy,
-- while `auth.uid()` still scopes the write to the caller. Returns the new total.
create or replace function public.add_player_exp(amount bigint)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
	new_exp bigint;
begin
	insert into public.player_profiles (user_id, exp)
	values (auth.uid(), greatest(0, amount))
	on conflict (user_id) do update
		set exp = player_profiles.exp + greatest(0, amount), updated_at = now()
	returning exp into new_exp;
	return new_exp;
end;
$$;

grant execute on function public.add_player_exp(bigint) to authenticated;
