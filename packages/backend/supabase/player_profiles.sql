-- Player profiles: per-player progression state, keyed by the Supabase auth user.
-- It holds an accumulated `exp` total — the frontend reads it and derives a level
-- from the D&D 5e experience table (see @3xl/shared's utils/progression/level.ts)
-- — plus the character whose portrait the player wears as their profile picture.
-- The profile card in the navbar shows all three.
--
-- Like `character_spawns`, this is player-owned and RLS-gated. But unlike the
-- spawns table it is NOT written directly by the frontend, and it has no
-- general-purpose "add experience" entry point either: the only mutation path is
-- the `award_combat_exp` RPC (see combat_results.sql), which decides the amount
-- itself from a finished fight. There is deliberately no insert/update policy, so
-- a client holding the anon key can read its own total but can neither set it nor
-- name the increment. The avatar is the one thing a player does set themselves,
-- and it too goes through an RPC (`set_player_avatar` below) rather than a write
-- policy, so the same row's experience stays out of reach.
--
-- The earlier `add_player_exp(bigint)` RPC — which took the amount straight from
-- the browser, and which the /claim panel called to award experience per card
-- pulled — is dropped below: experience now comes from combat only.
--
-- @3xl/backend creates this table automatically alongside the other tables (see
-- ../src/routes/show-templates.ts), so you normally do NOT need to run this file
-- — it's kept for reference and for provisioning by hand.
--
-- Idempotent: safe to re-run.

create table if not exists public.player_profiles (
	user_id uuid primary key references auth.users (id) on delete cascade,
	-- Accumulated experience. Starts at 0; only ever increased by award_combat_exp.
	exp bigint not null default 0,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

-- The character whose portrait the player uses as their profile picture, picked
-- from the avatar modal on the map panel's account card. Purely cosmetic. Which
-- portrait that character shows is not stored here — it is the definition's own
-- face, authored in the admin /characters/faces screen, so re-picking it there
-- moves every player's avatar with it. Null leaves the initial-letter avatar.
alter table public.player_profiles add column if not exists avatar_character_id text
	references public.character_templates (id) on delete set null;

-- Row-level security: a player may read only their own row. No insert/update
-- policy — mutation happens exclusively through the security-definer
-- `award_combat_exp` RPC in combat_results.sql and `set_player_avatar` below.
alter table public.player_profiles enable row level security;

drop policy if exists player_profiles_select_own on public.player_profiles;
create policy player_profiles_select_own on public.player_profiles
	for select using (auth.uid() = user_id);

-- Set (or clear, with null) the caller's avatar character. security definer
-- because the table takes no client writes: this touches exactly one cosmetic
-- column and can never reach `exp`. The id must name a known character template,
-- so a crafted call cannot store an arbitrary string — and the portrait has to be
-- earned: the caller needs a `character_spawns` card of that character in each of
-- the six spawn colours (SpawnColor in @3xl/shared). The picker in the frontend
-- greys out what it can't offer, but this is the rule that decides.
create or replace function public.set_player_avatar(p_character_id text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
	v_uid uuid := auth.uid();
	v_colors int;
begin
	if v_uid is null then
		raise exception 'You must be signed in to choose an avatar.';
	end if;
	if p_character_id is not null and not exists (
		select 1 from public.character_templates t where t.id = p_character_id
	) then
		raise exception 'Unknown character: %', p_character_id;
	end if;
	if p_character_id is not null then
		select count(distinct cs.color) into v_colors
		from public.character_spawns cs
		where cs.user_id = v_uid
			and cs.character_id = p_character_id
			and cs.color in ('red', 'yellow', 'blue', 'orange', 'green', 'purple');
		if v_colors < 6 then
			raise exception 'Collect this character in all six colours to wear its portrait.';
		end if;
	end if;
	insert into public.player_profiles (user_id, avatar_character_id)
		values (v_uid, p_character_id)
		on conflict (user_id) do update
			set avatar_character_id = excluded.avatar_character_id,
				updated_at = now();
	return p_character_id;
end;
$$;

grant execute on function public.set_player_avatar(text) to authenticated;

-- Retire the client-driven award path. `add_player_exp(amount)` let whoever held
-- the anon key name their own increment, so any browser could grant itself an
-- arbitrary total. Experience is now computed server-side from a finished fight
-- by `award_combat_exp` (combat_results.sql) and nowhere else.
drop function if exists public.add_player_exp(bigint);
