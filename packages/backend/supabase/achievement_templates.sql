-- Achievements in Supabase: the id of each badge, and who holds it.
--
-- Supabase keeps only the id. A badge's glyph, name and description live in the
-- local @3xl/data public/achievements.json, authored on the admin /achievements
-- screen; `achievement_templates` exists so that `player_achievements` has
-- something to foreign-key to, and so rewording a badge is one edit in the git
-- tree that no row anywhere can disagree with.
--
-- @3xl/backend creates these tables automatically on first use (it connects
-- directly to Postgres with the DB password), so you normally do NOT need to run
-- this file — it's kept for reference and for provisioning by hand. The local
-- achievements.json is the source of truth; the admin screen pushes it here via
-- POST /api/achievement-templates/sync.
--
-- Idempotent: safe to re-run.

create table if not exists public.achievement_templates (
	id text primary key,
	updated_at timestamptz not null default now()
);

alter table public.achievement_templates enable row level security;
drop policy if exists achievement_templates_select_all on public.achievement_templates;
create policy achievement_templates_select_all on public.achievement_templates
	for select using (true);

-- The users-to-achievements join: one row per badge a player holds. Readable by
-- everyone (a badge is worn), and writable by nobody through the anon key —
-- there is deliberately no insert/update/delete policy. Awarding is a rule, so
-- it will arrive as a security-definer RPC that decides for itself whether the
-- badge is earned, as claim_booster and award_combat_exp do for packs and
-- experience.
--
-- Both foreign keys cascade: deleting a player, or retiring a badge from the
-- local collection and syncing, removes the awards along with them.
create table if not exists public.player_achievements (
	user_id uuid not null references auth.users (id) on delete cascade,
	achievement_id text not null
		references public.achievement_templates (id) on delete cascade,
	awarded_at timestamptz not null default now(),
	primary key (user_id, achievement_id)
);

create index if not exists player_achievements_achievement_idx
	on public.player_achievements (achievement_id);

alter table public.player_achievements enable row level security;
drop policy if exists player_achievements_select_all on public.player_achievements;
create policy player_achievements_select_all on public.player_achievements
	for select using (true);
