-- Player avatars: the portraits a player owns, keyed by the Supabase auth user.
--
-- An avatar used to be a permission — wear any character you had collected in all
-- six colours — and it is an *item* now. One row is one avatar, and what an avatar
-- is, is the pair it carries: the character whose portrait it shows, and the colour
-- that portrait is printed in. The same character in two colours is two avatars;
-- the same character in the same colour is one, which is what the unique index
-- says.
--
-- They are dealt by the booster boxes and by nothing else. Opening a pack grants
-- exactly one, drawn from the same two possibilities the pack's five cards are: a
-- character on that box's show, in one of the three colours that box deals (white
-- boxes the secondaries, black ones the primaries — see booster_claims.sql). So
-- which avatars a player can ever hold is decided by where they were and when, the
-- same as their cards.
--
-- The table therefore takes NO client writes at all — no insert, update or delete
-- policy exists. The only writer is the security-definer `claim_booster` RPC. RLS
-- lets a player read their own rows and nobody else's; `player_profiles.
-- avatar_character_id` + `avatar_color` name which of them they are wearing, and
-- `set_player_avatar` (player_profiles.sql) refuses a pair with no row here.
--
-- Nothing about how a portrait *looks* is stored: the artwork is the character
-- definition's own face, cropped in the admin's /characters/faces screen, so
-- re-cropping it moves every held avatar of that character with it.
--
-- @3xl/backend creates this table automatically alongside the other tables (see
-- ../src/routes/show-templates.ts), so you normally do NOT need to run this file
-- — it's kept for reference and for provisioning by hand.
--
-- Idempotent: safe to re-run.

create table if not exists public.player_avatars (
	id uuid primary key default gen_random_uuid(),
	user_id uuid not null references auth.users (id) on delete cascade,
	character_id text not null references public.character_templates (id) on delete cascade,
	-- One of the six SpawnColor values (@3xl/shared types/character-spawn.type), and
	-- always one of the three the box that dealt it holds.
	color text not null,
	-- Where it came from, for the same reason a card records it: the show whose box
	-- dealt it and the town that box was opened in. Neither is read by any rule.
	show_id bigint references public.show_templates (id) on delete set null,
	location_id text,
	granted_at timestamptz not null default now()
);

-- One avatar is one (player, character, colour). A box that deals a pair already
-- held hands the held row straight back rather than minting a second one, so a
-- player's collection never carries the same portrait twice.
create unique index if not exists player_avatars_owned_key
	on public.player_avatars (user_id, character_id, color);

create index if not exists player_avatars_user_idx
	on public.player_avatars (user_id, granted_at desc);

-- Row-level security: a player may read only their own avatars. No insert/update/
-- delete policy — claim_booster (security definer) is the only writer, which is
-- what makes "opening a pack" the only way one exists.
alter table public.player_avatars enable row level security;

drop policy if exists player_avatars_select_own on public.player_avatars;
create policy player_avatars_select_own on public.player_avatars
	for select using (auth.uid() = user_id);
