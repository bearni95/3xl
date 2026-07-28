import { Router } from 'express';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { characters } from '@3xl/data';
import type { ShowEntry, ShowsCollection } from '@3xl/shared/types/show.type';
import type {
	ShowCharacterAssignments,
	ShowTemplate,
	ShowTemplateSyncResult
} from '@3xl/shared/types/show-template.type';
import { asyncHandler, httpError } from '../http-error';
import { getPool } from '../db';

/**
 * Read/sync API for show "templates" in Supabase — the minimal frontend-facing
 * identity of each saved show (id + display name) mirrored from the local
 * `@3xl/data` `public/shows.json` collection into the `show_templates` table,
 * plus the many-to-many `show_characters` join that assigns characters to shows.
 *
 * The local collection is the source of truth for templates. `GET /` returns the
 * remote state; `POST /sync` makes the remote table mirror the local collection
 * (upsert every local show, delete remote rows that no longer exist locally).
 *
 * Character assignments live only in Supabase — there is no local file for them.
 * `GET /assignments` returns the whole show→characters map; `PUT /:showId/characters`
 * replaces the assignment list for one show.
 *
 * Mirrors ./character-templates: talks to Supabase's Postgres directly via ../db
 * (the DB password) so it can provision the tables itself — no manual SQL step.
 */

// packages/backend/src/routes → packages/data. Same file as ./shows writes.
const SHOWS_PATH = fileURLToPath(new URL('../../../data/public/shows.json', import.meta.url));

// Ensure the tables exist exactly once per process, lazily on first use. We also
// (re)declare `character_templates` here because `show_characters` references it,
// and that table is otherwise only created lazily by ./character-templates —
// which may not have run yet. `character_spawns` (the per-player claimed
// instances behind the frontend's claim panel) is provisioned here too, since it
// references both `character_templates` and `show_templates`; unlike the other
// tables it's RLS-protected (each player only sees/creates their own spawns), as
// the frontend writes it directly with the anon key. `player_profiles` (the
// per-player experience total behind the profile card's level) is provisioned
// here too, along with `combat_results` and the `award_combat_exp` RPC — the
// single path that mutates it, since experience is earned by winning fights and
// nothing else (the old client-driven `add_player_exp` is dropped). Finally,
// `booster_claims` (the per-pack rate-limit ledger) plus the `claim_booster`
// security-definer RPC — the only path that inserts spawns now — enforce the
// daily booster limit (= player level, capped at 20, resetting at midnight
// Europe/Madrid) and the "only towns celebrating a festa major today" rule
// server-side; the client insert policy on `character_spawns` is dropped so the
// rules cannot be bypassed. It reads `festivities` (provisioned lazily by
// ./festivities). `municipality_holders` / `municipality_sieges` (who occupies
// each town on the map, and how far each challenger has got towards taking it)
// round it off — world-readable but written only by award_combat_exp, which
// settles territory in the same transaction as the experience award. All DDL is
// idempotent.
let ensured: Promise<void> | null = null;
/**
 * Provision the whole authoring/gameplay schema (tables, RLS, RPCs) idempotently,
 * once per process. Exported so sibling routes that depend on parts of it — e.g.
 * ./users, whose grants are only honoured once the updated claim_booster /
 * boosters_status RPCs are deployed — can guarantee it has run before they read
 * or write, rather than relying on a show-templates request having happened first.
 */
export function ensureTables(): Promise<void> {
	if (!ensured) {
		ensured = getPool()
			.query(
				`create table if not exists character_templates (
					id text primary key,
					name text not null,
					updated_at timestamptz not null default now()
				);
				create table if not exists show_templates (
					id bigint primary key,
					name text not null,
					updated_at timestamptz not null default now()
				);
				create table if not exists show_characters (
					show_id bigint not null references show_templates (id) on delete cascade,
					character_id text not null references character_templates (id) on delete cascade,
					primary key (show_id, character_id)
				);
				create table if not exists character_spawns (
						id uuid primary key default gen_random_uuid(),
						user_id uuid not null references auth.users (id) on delete cascade,
						character_id text not null references character_templates (id) on delete cascade,
						show_id bigint references show_templates (id) on delete set null,
						location_id text,
						color text,
						-- Gameplay stat, rolled at claim time (SPAWN_STAT_MIN..SPAWN_STAT_MAX).
						stat smallint not null default 1,
						created_at timestamptz not null default now()
					);
				alter table character_spawns add column if not exists location_id text;
				alter table character_spawns add column if not exists color text;
				-- Backfill colours on rows that predate the column, weighting the three
				-- primaries 3x the three secondaries (matches randomSpawnColor).
				update character_spawns cs set color = pick.color
				from (
					select id, case
						when r < 3.0 / 12 then 'red'
						when r < 6.0 / 12 then 'yellow'
						when r < 9.0 / 12 then 'blue'
						when r < 10.0 / 12 then 'orange'
						when r < 11.0 / 12 then 'green'
						else 'purple'
					end as color
					from (select id, random() as r from character_spawns where color is null) seeded
				) pick
				where cs.id = pick.id;
				-- Backfill the stat column on tables provisioned before it existed, then
				-- clamp any stored values into range so the check constraint below holds.
				alter table character_spawns add column if not exists stat smallint;
				update character_spawns set stat = 1 where stat is null;
				update character_spawns set stat = least(9, greatest(1, stat))
					where stat < 1 or stat > 9;
				alter table character_spawns alter column stat set default 1;
				alter table character_spawns alter column stat set not null;
				-- Range constraint, dropped/re-added so it's idempotent. Keep the bounds
				-- in sync with SPAWN_STAT_MIN/SPAWN_STAT_MAX in @3xl/shared.
				alter table character_spawns drop constraint if exists character_spawns_stat_range;
				alter table character_spawns
					add constraint character_spawns_stat_range check (stat between 1 and 9);
				alter table character_spawns enable row level security;
				drop policy if exists character_spawns_select_own on character_spawns;
				create policy character_spawns_select_own on character_spawns
						for select using (auth.uid() = user_id);
				drop policy if exists character_spawns_insert_own on character_spawns;
				create policy character_spawns_insert_own on character_spawns
						for insert with check (auth.uid() = user_id);
				drop policy if exists character_spawns_delete_own on character_spawns;
				create policy character_spawns_delete_own on character_spawns
						for delete using (auth.uid() = user_id);
				-- Per-player progression: an accumulated experience total the frontend
				-- reads to derive a level (D&D 5e table). RLS lets a player read only
				-- their own row; it is never written directly — the award_combat_exp RPC
				-- further down (security definer) is the only path that mutates it, and it
				-- derives the amount itself from a finished fight, so a client can neither
				-- set an arbitrary total nor name its own increment.
				create table if not exists player_profiles (
						user_id uuid primary key references auth.users (id) on delete cascade,
						exp bigint not null default 0,
						created_at timestamptz not null default now(),
						updated_at timestamptz not null default now()
					);
				-- The character whose portrait the player uses as their profile picture,
				-- chosen from the avatar picker on the map panel's account card. Purely
				-- cosmetic, and the only part of this row a player sets themselves —
				-- through set_player_avatar below, since the table takes no client
				-- writes at all. Null (the default) leaves them on the initial-letter
				-- avatar. Which portrait each character shows is not stored here: it is
				-- the definition's own face, authored in the admin /characters/faces
				-- screen, so re-picking it there moves every player's avatar with it.
				alter table player_profiles add column if not exists avatar_character_id text
					references character_templates (id) on delete set null;
				alter table player_profiles enable row level security;
				drop policy if exists player_profiles_select_own on player_profiles;
				create policy player_profiles_select_own on player_profiles
						for select using (auth.uid() = user_id);
				-- Set (or clear, with null) the caller's avatar character. security
				-- definer because player_profiles has no client write policy — this
				-- writes exactly one cosmetic column and can never touch exp. The id
				-- must be a known character template, so a crafted call can't store an
				-- arbitrary string.
				create or replace function set_player_avatar(p_character_id text)
				returns text language plpgsql security definer set search_path = public as $set_player_avatar$
				declare
						v_uid uuid := auth.uid();
				begin
						if v_uid is null then
								raise exception 'You must be signed in to choose an avatar.';
						end if;
						if p_character_id is not null and not exists (
								select 1 from character_templates t where t.id = p_character_id
						) then
								raise exception 'Unknown character: %', p_character_id;
						end if;
						insert into player_profiles (user_id, avatar_character_id)
								values (v_uid, p_character_id)
								on conflict (user_id) do update
										set avatar_character_id = excluded.avatar_character_id,
												updated_at = now();
						return p_character_id;
				end;
				$set_player_avatar$;
				grant execute on function set_player_avatar(text) to authenticated;
				-- Retire the client-driven award path: add_player_exp(amount) took the
				-- increment straight from the browser, so anyone holding the anon key could
				-- grant themselves any total. Experience now comes from combat only, via
				-- award_combat_exp below.
				drop function if exists add_player_exp(bigint);
					-- Booster rate-limit ledger: one row per pack a player opens, written
					-- only by the claim_booster RPC below. Lets the daily-limit check count
					-- opened packs directly instead of regrouping character_spawns. RLS lets
					-- a player read only their own claims.
					create table if not exists booster_claims (
							id uuid primary key default gen_random_uuid(),
							user_id uuid not null references auth.users (id) on delete cascade,
							show_id bigint references show_templates (id) on delete set null,
							location_id text not null,
							claimed_at timestamptz not null default now()
						);
					create index if not exists booster_claims_user_day_idx
						on booster_claims (user_id, claimed_at);
						-- Admin-granted extra daily claims: an additive, day-scoped bump to a
						-- player's booster cap for one Europe/Madrid date, written only by the
						-- admin /api/users route (see ./users.ts). claim_booster / boosters_status
						-- add today's grants on top of the level cap; rows lapse at Catalan
						-- midnight (they are only ever summed for today's date). No RLS/select
						-- policy — the anon key never reads this; the security-definer RPCs do.
						create table if not exists booster_grants (
								id uuid primary key default gen_random_uuid(),
								user_id uuid not null references auth.users (id) on delete cascade,
								grant_date date not null,
								amount integer not null,
								created_at timestamptz not null default now()
							);
						create index if not exists booster_grants_user_day_idx
							on booster_grants (user_id, grant_date);
					alter table booster_claims enable row level security;
					drop policy if exists booster_claims_select_own on booster_claims;
					create policy booster_claims_select_own on booster_claims
							for select using (auth.uid() = user_id);
					-- Enforcement: players may no longer insert spawns directly. Opening a
					-- pack now goes exclusively through claim_booster (security definer),
					-- which applies the festa-major-today and daily-limit rules server-side.
					-- Reading/deleting one's own spawns stays client-side (policies kept).
					drop policy if exists character_spawns_insert_own on character_spawns;
					-- Player level from an accumulated experience total, using the same
					-- cumulative D&D 5e thresholds as @3xl/shared utils/progression/level.ts
					-- (levelForExp); level 20 is the cap. Keep these in sync with that file.
					create or replace function level_for_exp(p_exp bigint)
					returns int language sql immutable set search_path = public as $level_for_exp$
						select case
							when p_exp >= 355000 then 20
							when p_exp >= 305000 then 19
							when p_exp >= 265000 then 18
							when p_exp >= 225000 then 17
							when p_exp >= 195000 then 16
							when p_exp >= 165000 then 15
							when p_exp >= 140000 then 14
							when p_exp >= 120000 then 13
							when p_exp >= 100000 then 12
							when p_exp >= 85000 then 11
							when p_exp >= 64000 then 10
							when p_exp >= 48000 then 9
							when p_exp >= 34000 then 8
							when p_exp >= 23000 then 7
							when p_exp >= 14000 then 6
							when p_exp >= 6500 then 5
							when p_exp >= 2700 then 4
							when p_exp >= 900 then 3
							when p_exp >= 300 then 2
							else 1
						end;
					$level_for_exp$;
					-- Open a booster pack for the caller, enforced entirely server-side:
					--   * the town (p_location_id) must be celebrating a festa major *today*
					--     in Europe/Madrid (a festivities row for today's Catalan date);
					--   * the player may open at most (their level, capped at 20) packs per
					--     day, the day resetting at midnight Europe/Madrid.
					-- It then rolls 5 cards from the show's assigned, template-backed roster
					-- (weighted by rarity, colour and stat exactly as the frontend used to)
					-- and returns the inserted spawns. A per-user advisory lock serialises
					-- concurrent opens so the limit can't be raced. security definer: it
					-- inserts despite character_spawns now having no client insert policy.
					create or replace function claim_booster(p_show_id bigint, p_location_id text)
					returns setof character_spawns
					language plpgsql security definer set search_path = public as $claim_booster$
					declare
							v_uid uuid := auth.uid();
							v_today date := (now() at time zone 'Europe/Madrid')::date;
							v_day_start timestamptz := date_trunc('day', now() at time zone 'Europe/Madrid') at time zone 'Europe/Madrid';
							v_size constant int := 5;
							v_exp bigint;
							v_level int;
							v_granted int;
							v_cap int;
							v_used int;
							v_ids text[];
							v_rarities int[];
							v_weights numeric[];
							v_total numeric;
							v_roll numeric;
							v_pick text;
							v_color text;
							v_stat int;
							v_row character_spawns%rowtype;
							i int;
							j int;
					begin
							if v_uid is null then
									raise exception 'You must be signed in to open a booster.';
							end if;
							if p_location_id is null or p_location_id = '' then
									raise exception 'A location is required to open a booster.';
							end if;
							-- Serialise this player's opens so the daily limit can't be raced.
							perform pg_advisory_xact_lock(hashtextextended(v_uid::text, 0));
							-- The town must be celebrating a festa major today.
							if not exists (
									select 1 from festivities f
									where f.location_id = p_location_id and f.date = v_today
							) then
									raise exception 'This town is not celebrating a festa major today.';
							end if;
							-- Daily cap = player level (>=1, capped at 20) plus any admin-granted
							-- extra claims for today, reset at Catalan midnight.
							select coalesce(exp, 0) into v_exp from player_profiles where user_id = v_uid;
							v_level := level_for_exp(coalesce(v_exp, 0));
							select coalesce(sum(amount), 0) into v_granted from booster_grants
									where user_id = v_uid and grant_date = v_today;
							v_cap := v_level + v_granted;
							select count(*) into v_used from booster_claims
									where user_id = v_uid and claimed_at >= v_day_start;
							if v_used >= v_cap then
									raise exception 'Daily booster limit reached: % of % packs opened today. More unlock at midnight.', v_used, v_cap;
							end if;
							-- Roll pool: characters assigned to the show (any show when null) that
							-- exist as templates, with their rarity tiers.
							with pool as (
									select distinct ct.id as id, coalesce(ct.rarity, 0) as rarity
									from show_characters sc
									join character_templates ct on ct.id = sc.character_id
									where p_show_id is null or sc.show_id = p_show_id
							)
							select array_agg(id order by id), array_agg(rarity order by id)
									into v_ids, v_rarities
							from pool;
							if v_ids is null or array_length(v_ids, 1) is null then
									raise exception 'There are no claimable characters for this show.';
							end if;
							-- Selection weights: tier 0 weighs 1, each higher tier 2x rarer
							-- (matches rarityWeight / RARITY_STEP_FACTOR in @3xl/shared).
							select array_agg(w order by ord), sum(w)
									into v_weights, v_total
							from (
									select ord, 1.0 / (2 ^ r) as w
									from unnest(v_rarities) with ordinality as t(r, ord)
							) s;
							-- Record the pack in the rate-limit ledger, then roll its cards.
							insert into booster_claims (user_id, show_id, location_id)
									values (v_uid, p_show_id, p_location_id);
							for i in 1..v_size loop
									-- Weighted-by-rarity pick (cumulative, matches weightedRarityIndex).
									v_roll := random() * v_total;
									v_pick := v_ids[array_length(v_ids, 1)];
									for j in 1..array_length(v_ids, 1) loop
											v_roll := v_roll - v_weights[j];
											if v_roll < 0 then
													v_pick := v_ids[j];
													exit;
											end if;
									end loop;
									-- Weighted colour: primaries 3/12, secondaries 1/12 (randomSpawnColor).
									v_roll := random() * 12;
									v_color := case
											when v_roll < 3 then 'red'
											when v_roll < 6 then 'yellow'
											when v_roll < 9 then 'blue'
											when v_roll < 10 then 'orange'
											when v_roll < 11 then 'green'
											else 'purple'
									end;
									-- Uniform stat 1..9 (randomSpawnStat / SPAWN_STAT_MIN..MAX).
									v_stat := 1 + floor(random() * 9)::int;
									insert into character_spawns (user_id, character_id, show_id, location_id, color, stat)
											values (v_uid, v_pick, p_show_id, p_location_id, v_color, v_stat)
											returning * into v_row;
									return next v_row;
							end loop;
							return;
					end;
					$claim_booster$;
					grant execute on function claim_booster(bigint, text) to authenticated;
					-- The caller's daily allowance: their level, packs opened since Catalan
					-- midnight, and how many remain. Powers the claim UI's limit display.
					create or replace function boosters_status()
					returns table (level int, used int, remaining int)
					language plpgsql security definer set search_path = public as $boosters_status$
					declare
							v_uid uuid := auth.uid();
							v_exp bigint;
							v_granted int;
							v_today date := (now() at time zone 'Europe/Madrid')::date;
							v_day_start timestamptz := date_trunc('day', now() at time zone 'Europe/Madrid') at time zone 'Europe/Madrid';
					begin
							if v_uid is null then
									return;
							end if;
							select coalesce(exp, 0) into v_exp from player_profiles where user_id = v_uid;
							-- The returned level is the effective daily cap: level from exp plus
							-- any admin grants for today, so the claim UI reflects granted claims.
							select coalesce(sum(amount), 0) into v_granted from booster_grants
									where user_id = v_uid and grant_date = v_today;
							level := level_for_exp(coalesce(v_exp, 0)) + v_granted;
							select count(*) into used from booster_claims
									where user_id = v_uid and claimed_at >= v_day_start;
							remaining := greatest(0, level - used);
							return next;
					end;
					$boosters_status$;
					grant execute on function boosters_status() to authenticated;
					-- Recycle cards: destroy a batch of the caller's own spawns and grant
					-- one extra daily claim per full group of 10 destroyed. Cards are worth
					-- nothing individually — the player trades them back for booster claims
					-- (an additive booster_grants row for today, honoured by claim_booster /
					-- boosters_status). security definer: it writes booster_grants, which has
					-- no client policy. Same per-user advisory lock as claim_booster so a
					-- concurrent claim/recycle can't race the grant.
					create or replace function recycle_spawns(p_spawn_ids uuid[])
					returns table (recycled int, granted int)
					language plpgsql security definer set search_path = public as $recycle_spawns$
					declare
							v_uid uuid := auth.uid();
							v_today date := (now() at time zone 'Europe/Madrid')::date;
							v_count int;
							v_grant int;
					begin
							if v_uid is null then
									raise exception 'You must be signed in to recycle cards.';
							end if;
							if p_spawn_ids is null or array_length(p_spawn_ids, 1) is null then
									raise exception 'Select at least 10 cards to recycle.';
							end if;
							perform pg_advisory_xact_lock(hashtextextended(v_uid::text, 0));
							-- Only the caller's own spawns among those requested are eligible;
							-- count them before deleting so the grant matches what is destroyed.
							select count(*) into v_count from character_spawns
									where user_id = v_uid and id = any(p_spawn_ids);
							v_grant := v_count / 10; -- integer division: one claim per full 10
							if v_grant < 1 then
									raise exception 'Recycle 10 cards to earn an extra claim; only % selected.', v_count;
							end if;
							delete from character_spawns where user_id = v_uid and id = any(p_spawn_ids);
							insert into booster_grants (user_id, grant_date, amount)
									values (v_uid, v_today, v_grant);
							recycled := v_count;
							granted := v_grant;
							return next;
					end;
					$recycle_spawns$;
					grant execute on function recycle_spawns(uuid[]) to authenticated;
					-- Combat rewards: the ONLY way a player earns experience. Claiming cards,
					-- opening packs and recycling award nothing at all — winning fights does.
					-- One row per finished fight, written solely by award_combat_exp below: the
					-- audit trail behind every experience gain. RLS lets a player read only their
					-- own fights; there is no client write path.
					create table if not exists combat_results (
							id uuid primary key default gen_random_uuid(),
							user_id uuid not null references auth.users (id) on delete cascade,
							outcome text not null check (outcome in ('win', 'lose', 'draw')),
							-- Compound team HP at the end / at the start, after server-side clamping.
							hp_left integer not null,
							hp_max integer not null,
							-- The level whose span was at stake, and the span itself.
							level integer not null,
							level_span bigint not null,
							-- Experience actually awarded (0 for anything but a win).
							exp_awarded bigint not null,
							fought_at timestamptz not null default now()
						);
					create index if not exists combat_results_user_day_idx
						on combat_results (user_id, fought_at);
					alter table combat_results enable row level security;
					drop policy if exists combat_results_select_own on combat_results;
					create policy combat_results_select_own on combat_results
							for select using (auth.uid() = user_id);
					-- Cumulative experience at which a level begins — the same D&D 5e table as
					-- level_for_exp, read the other way round. Mirrors expForLevel in @3xl/shared.
					create or replace function exp_for_level(p_level int)
					returns bigint language sql immutable set search_path = public as $exp_for_level$
						select case least(greatest(p_level, 1), 20)
							when 1 then 0
							when 2 then 300
							when 3 then 900
							when 4 then 2700
							when 5 then 6500
							when 6 then 14000
							when 7 then 23000
							when 8 then 34000
							when 9 then 48000
							when 10 then 64000
							when 11 then 85000
							when 12 then 100000
							when 13 then 120000
							when 14 then 140000
							when 15 then 165000
							when 16 then 195000
							when 17 then 225000
							when 18 then 265000
							when 19 then 305000
							else 355000
						end::bigint;
					$exp_for_level$;
					-- The full width of a level: the experience between its own threshold and the
					-- next one (300 at level 1, 600 at level 2, 1800 at level 3, …) — the whole
					-- level, not just the part still unearned. 0 at level 20. Mirrors levelSpanExp.
					create or replace function level_span_exp(p_level int)
					returns bigint language sql immutable set search_path = public as $level_span_exp$
						select case
							when least(greatest(p_level, 1), 20) >= 20 then 0::bigint
							else exp_for_level(least(greatest(p_level, 1), 20) + 1)
								- exp_for_level(least(greatest(p_level, 1), 20))
						end;
					$level_span_exp$;
					-- Territory: who actually occupies each municipality on the map.
					--
					-- A town with no row here is still on its seeded "OG" team — the one every
					-- client rolls deterministically from the town's own geometry, which is why
					-- nothing needs storing for it. The moment a player takes a town a row
					-- appears and becomes the source of truth: the map shows THIS team and the
					-- next challenger fights it, with the seed left only as the fallback for
					-- towns nobody has taken yet.
					--
					-- The team is frozen as a flat jsonb copy of the winning spawns' gameplay
					-- attributes, not as character_spawns references: those rows are RLS-scoped
					-- to their owner, so no other player could read them, and the occupying team
					-- has to be visible to everyone looking at the town. It also pins the
					-- garrison at the strength that won it, whatever the holder does with the
					-- cards afterwards.
					--
					-- turnover counts how many times the town has changed hands (1 the first
					-- time a player takes it off the OG team). It is also the bar the next
					-- challenger has to clear: taking a town needs turnover + 1 wins against the
					-- sitting team, so every flip makes the seat harder to take.
					--
					-- World-readable (a select policy of plain true) — the map has to show every
					-- town's occupant to every visitor, signed in or not. There is no client
					-- write path at all: award_combat_exp below is the only writer.
					create table if not exists municipality_holders (
							location_id text primary key,
							user_id uuid not null references auth.users (id) on delete cascade,
							-- Display name resolved server-side when the town was taken, so the map
							-- can name the occupant without reading auth.users from the browser.
							holder_name text,
							-- [{"character_id": text, "color": text, "stat": int}, …] in fielded order.
							team jsonb not null default '[]'::jsonb,
							turnover integer not null default 1,
							taken_at timestamptz not null default now()
						);
					alter table municipality_holders enable row level security;
					drop policy if exists municipality_holders_select_all on municipality_holders;
					create policy municipality_holders_select_all on municipality_holders
							for select using (true);
					-- One challenger's progress against one town's sitting team: the wins banked
					-- so far towards the turnover + 1 it takes to dethrone them. Scoped to the
					-- generation they were won against (turnover), so when a town flips every
					-- siege on it is void — the row is deleted outright, and any that survived
					-- would be ignored on the turnover mismatch anyway. A player reads only
					-- their own progress.
					create table if not exists municipality_sieges (
							location_id text not null,
							user_id uuid not null references auth.users (id) on delete cascade,
							wins integer not null default 0,
							turnover integer not null default 0,
							updated_at timestamptz not null default now(),
							primary key (location_id, user_id)
						);
					create index if not exists municipality_sieges_location_idx
						on municipality_sieges (location_id);
					alter table municipality_sieges enable row level security;
					drop policy if exists municipality_sieges_select_own on municipality_sieges;
					create policy municipality_sieges_select_own on municipality_sieges
							for select using (auth.uid() = user_id);
					-- The pre-territory two-argument signature is dropped rather than replaced:
					-- leaving it in place would give PostgREST two overloads to choose between
					-- and make every rpc('award_combat_exp') call ambiguous.
					drop function if exists award_combat_exp(text, jsonb);
					-- Award experience for one finished fight:
					--   * a loss or a draw earns nothing;
					--   * a win earns a share of the player's CURRENT level's full span (see
					--     level_span_exp), scaled linearly by the compound HP their team is left
					--     with: sum(hp_left) / sum(max_hp). A flawless win — no damage taken —
					--     earns the entire span, i.e. one whole level's worth measured from the
					--     base of the level; a win at half health earns half of it.
					-- Combat runs in the browser, so the report is treated as a claim and bounded
					-- rather than trusted: every spawn must belong to the caller, each fighter's
					-- max_hp is re-derived from its stat (the HP attribute, DEF + 1, is the pool
					-- itself) rather than read from the report, and hp_left is clamped to [0, that max],
					-- and the amount itself is never sent by the client — it is derived here from
					-- the player's stored experience. p_fighters is the player's side only, as
					-- [{"spawn_id": uuid, "hp_left": number, "max_hp": number}]. The OUT names
					-- deliberately avoid the column names used in the body. security definer: it
					-- writes player_profiles and combat_results, neither client-writable.
					--
					-- It also settles TERRITORY in the same transaction, when the fight was
					-- picked over a town (p_location_id, plus the turnover the browser saw that
					-- town on):
					--   * a win banks one siege win against that town's sitting team;
					--   * once the player has banked turnover + 1 of them the town changes
					--     hands: they become its holder, the team they won with is frozen as
					--     the new garrison, turnover goes up (so the NEXT challenger owes one
					--     more win than they did), and every siege on the town is wiped;
					--   * if the town changed hands while the fight was running, the team that
					--     was beaten is no longer the sitting one, so the win banks nothing and
					--     the result comes back flagged stale.
					-- Here too the client only says what it fought: the win count, the bar and
					-- the occupancy change are all decided here.
					create or replace function award_combat_exp(
							p_outcome text,
							p_fighters jsonb,
							p_location_id text default null,
							p_holder_turnover int default 0
						)
					returns table (
							awarded_exp bigint,
							total_exp bigint,
							at_level int,
							span_exp bigint,
							team_hp_left int,
							team_hp_max int,
							town_captured boolean,
							town_wins int,
							town_required int,
							town_turnover int,
							town_stale boolean
						)
					language plpgsql security definer set search_path = public as $award_combat_exp$
					declare
							v_uid uuid := auth.uid();
							v_reported int;
							v_distinct int;
							v_owned int;
							v_exp bigint;
							v_level int;
							v_span bigint;
							v_hp_left int;
							v_hp_max int;
							v_award bigint;
							v_total bigint;
							v_holder uuid;
							v_turnover int;
							v_required int;
							v_wins int;
							v_stale boolean := false;
							v_captured boolean := false;
							v_team jsonb;
							v_name text;
					begin
							if v_uid is null then
								raise exception 'You must be signed in to earn experience.';
							end if;
							if p_outcome is null or p_outcome not in ('win', 'lose', 'draw') then
								raise exception 'Unknown combat outcome: %.', coalesce(p_outcome, 'null');
							end if;
							if p_fighters is null or jsonb_typeof(p_fighters) <> 'array' then
								raise exception 'A combat report must list the fighters that took part.';
							end if;
							-- Serialise this player's mutations, matching claim_booster / recycle_spawns.
							perform pg_advisory_xact_lock(hashtextextended(v_uid::text, 0));
							-- The reported team, bounded against what the caller actually owns.
							with reported as (
								select f.spawn_id, f.hp_left, f.max_hp
								from jsonb_to_recordset(p_fighters)
									as f(spawn_id uuid, hp_left numeric, max_hp numeric)
							),
							owned as (
								select
									r.hp_left,
									-- HP pool: the HP attribute itself (DEF + 1, DEF being the stat's
									-- complement clamped 1..9) — re-derived, never read from the report.
									(greatest(1, least(9, 10 - cs.stat)) + 1) as hp_pool
								from reported r
								join character_spawns cs on cs.id = r.spawn_id and cs.user_id = v_uid
							),
							bounded as (
								select
									o.hp_pool as capped_max,
									coalesce(o.hp_left, 0) as raw_left
								from owned o
							)
							select
								(select count(*) from reported),
								(select count(distinct spawn_id) from reported),
								(select count(*) from owned),
								coalesce((select sum(capped_max) from bounded), 0)::int,
								coalesce((select sum(least(greatest(raw_left, 0), capped_max)) from bounded), 0)::int
							into v_reported, v_distinct, v_owned, v_hp_max, v_hp_left;
							if v_reported = 0 then
								raise exception 'A combat report must list the fighters that took part.';
							end if;
							if v_reported > 3 then
								raise exception 'A team fields at most 3 fighters; % were reported.', v_reported;
							end if;
							if v_distinct <> v_reported then
								raise exception 'A fighter cannot be reported twice.';
							end if;
							if v_owned <> v_reported then
								raise exception 'Every fighter must be one of your own claimed characters.';
							end if;
							-- The level at stake is the one the player is on now, before the award.
							select coalesce(exp, 0) into v_exp from player_profiles where user_id = v_uid;
							v_exp := coalesce(v_exp, 0);
							v_level := level_for_exp(v_exp);
							v_span := level_span_exp(v_level);
							if p_outcome = 'win' and v_span > 0 and v_hp_max > 0 then
								v_award := round(v_span::numeric * v_hp_left::numeric / v_hp_max::numeric);
							else
								v_award := 0;
							end if;
							insert into combat_results
								(user_id, outcome, hp_left, hp_max, level, level_span, exp_awarded)
								values (v_uid, p_outcome, v_hp_left, v_hp_max, v_level, v_span, v_award);
							if v_award > 0 then
								insert into player_profiles (user_id, exp)
									values (v_uid, v_award)
									on conflict (user_id) do update
										set exp = player_profiles.exp + v_award, updated_at = now()
									returning exp into v_total;
							else
								v_total := v_exp;
							end if;
							-- Territory, when this fight was picked over a town on the map.
							if p_location_id is not null and p_location_id <> '' then
								-- Serialise per town, so two challengers finishing at the same moment
								-- can't both read the same turnover and both take it.
								perform pg_advisory_xact_lock(hashtextextended('municipality:' || p_location_id, 0));
								select h.user_id, h.turnover into v_holder, v_turnover
									from municipality_holders h where h.location_id = p_location_id;
								-- A town whose sitting team is the caller's own cannot be fought for:
								-- there is nothing to take off yourself. The map never offers the
								-- challenge, so a report that names one did not come from the game —
								-- reject it outright, rolling back the experience with it, rather than
								-- paying out for a fight that should not have happened.
								if v_holder is not null and v_holder = v_uid then
									raise exception 'You already hold this town — you cannot challenge your own team.';
								end if;
								-- No row at all means the town is still on its seeded OG team: turnover 0.
								v_turnover := coalesce(v_turnover, 0);
								v_required := greatest(1, v_turnover + 1);
								-- The browser fought whatever team it had loaded; if the town has
								-- flipped since, that was not the sitting team and the win buys nothing.
								v_stale := coalesce(p_holder_turnover, 0) <> v_turnover;
								if p_outcome = 'win' and not v_stale then
									-- Bank the win. A stored siege from an older generation is not added
									-- to — it restarts at this win, since it was earned against a team
									-- that no longer sits there.
									insert into municipality_sieges (location_id, user_id, wins, turnover)
										values (p_location_id, v_uid, 1, v_turnover)
										on conflict (location_id, user_id) do update
											set wins = case
													when municipality_sieges.turnover = excluded.turnover
														then municipality_sieges.wins + 1
													else 1
												end,
												turnover = excluded.turnover,
												updated_at = now()
										returning wins into v_wins;
									if v_wins >= v_required then
										-- The town falls. Freeze the team that won it, in fielded order,
										-- copying each spawn's attributes rather than referencing the row.
										select jsonb_agg(
												jsonb_build_object(
													'character_id', cs.character_id,
													'color', cs.color,
													'stat', cs.stat
												) order by f.ord
											)
											into v_team
											-- Ordinality over the raw elements (a scalar-returning SRF) rather
											-- than over jsonb_to_recordset, whose column-definition list does
											-- not combine with WITH ORDINALITY.
											from (
												select (e.elem->>'spawn_id')::uuid as spawn_id, e.ord
												from jsonb_array_elements(p_fighters) with ordinality as e(elem, ord)
											) f
											join character_spawns cs on cs.id = f.spawn_id and cs.user_id = v_uid;
										-- Name the new occupant from their account, so the map never has to
										-- read auth.users from the browser.
										select coalesce(
												nullif(btrim(coalesce(
													u.raw_user_meta_data->>'full_name',
													u.raw_user_meta_data->>'name',
													''
												)), ''),
												split_part(coalesce(u.email, ''), '@', 1)
											)
											into v_name
											from auth.users u where u.id = v_uid;
										insert into municipality_holders
											(location_id, user_id, holder_name, team, turnover, taken_at)
											values (p_location_id, v_uid, v_name, coalesce(v_team, '[]'::jsonb),
												v_turnover + 1, now())
											on conflict (location_id) do update
												set user_id = excluded.user_id,
													holder_name = excluded.holder_name,
													team = excluded.team,
													turnover = excluded.turnover,
													taken_at = excluded.taken_at;
										-- A new generation voids every siege on the town, the winner's included.
										delete from municipality_sieges where location_id = p_location_id;
										v_captured := true;
										v_turnover := v_turnover + 1;
										v_wins := v_required;
									end if;
								else
									-- Nothing banked (a loss, a draw or a stale fight): report the
									-- progress they already had against this generation.
									select s.wins into v_wins from municipality_sieges s
										where s.location_id = p_location_id
											and s.user_id = v_uid
											and s.turnover = v_turnover;
									v_wins := coalesce(v_wins, 0);
								end if;
								town_captured := v_captured;
								town_wins := v_wins;
								town_required := v_required;
								town_turnover := v_turnover;
								town_stale := v_stale;
							end if;
							awarded_exp := v_award;
							total_exp := coalesce(v_total, v_exp);
							at_level := v_level;
							span_exp := v_span;
							team_hp_left := v_hp_left;
							team_hp_max := v_hp_max;
							return next;
					end;
					$award_combat_exp$;
					grant execute on function award_combat_exp(text, jsonb, text, int) to authenticated`
			)
			.then(() => undefined)
			.catch((error: unknown) => {
				// Reset so a transient failure (e.g. bad password) can be retried on the
				// next request instead of being cached forever.
				ensured = null;
				const message = error instanceof Error ? error.message : String(error);
				httpError(502, `Supabase DB connection failed: ${message}`);
			});
	}
	return ensured;
}

/** The local saved-show collection projected to templates: only id + name. */
async function localTemplates(): Promise<ShowTemplate[]> {
	let shows: ShowEntry[] = [];
	try {
		const raw = await readFile(SHOWS_PATH, 'utf-8');
		const parsed = JSON.parse(raw) as ShowsCollection;
		if (Array.isArray(parsed?.shows)) shows = parsed.shows;
	} catch {
		shows = [];
	}
	return shows
		.map((entry) => ({ id: entry.show.id, name: entry.show.name }))
		.sort((a, b) => a.id - b.id);
}

/** Fetch the remote templates, ordered by id. pg returns bigint as string. */
async function fetchRemote(): Promise<ShowTemplate[]> {
	await ensureTables();
	const { rows } = await getPool().query<{ id: string; name: string }>(
		'select id, name from show_templates order by id'
	);
	return rows.map((row) => ({ id: Number(row.id), name: row.name }));
}

/** Fetch every show→characters assignment as a { [showId]: characterId[] } map. */
async function fetchAssignments(): Promise<ShowCharacterAssignments> {
	await ensureTables();
	const { rows } = await getPool().query<{ show_id: string; character_id: string }>(
		'select show_id, character_id from show_characters order by show_id, character_id'
	);
	const map: ShowCharacterAssignments = {};
	for (const row of rows) {
		const showId = Number(row.show_id);
		(map[showId] ??= []).push(row.character_id);
	}
	return map;
}

export const showTemplatesRouter = Router();

// The remote template list, for the admin to compare against the local shows.
showTemplatesRouter.get(
	'/',
	asyncHandler(async (_req, res) => {
		const templates = await fetchRemote();
		res.json({ templates });
	})
);

// Mirror the local collection into Supabase: upsert every local template, then
// delete any remote row that no longer exists locally. Idempotent.
showTemplatesRouter.post(
	'/sync',
	asyncHandler(async (_req, res) => {
		const pool = getPool();
		const local = await localTemplates();
		const before = await fetchRemote();

		const beforeById = new Map(before.map((t) => [t.id, t]));
		const localIds = local.map((t) => t.id);
		const localIdSet = new Set(localIds);

		// Classify against the remote state before we touch it, so the response
		// describes exactly what this sync did.
		const added: number[] = [];
		const updated: number[] = [];
		for (const template of local) {
			const existing = beforeById.get(template.id);
			if (!existing) added.push(template.id);
			else if (existing.name !== template.name) updated.push(template.id);
		}
		const removed = before.map((t) => t.id).filter((id) => !localIdSet.has(id));

		// Bulk upsert via parallel arrays, then drop any id not in the local set.
		// Deleting a show cascades to its `show_characters` rows.
		if (local.length > 0) {
			await pool.query(
				`insert into show_templates (id, name)
				 select * from unnest($1::bigint[], $2::text[])
				 on conflict (id) do update set name = excluded.name, updated_at = now()`,
				[localIds, local.map((t) => t.name)]
			);
		}
		if (removed.length > 0) {
			await pool.query('delete from show_templates where not (id = any($1::bigint[]))', [localIds]);
		}

		const result: ShowTemplateSyncResult = {
			templates: await fetchRemote(),
			added,
			updated,
			removed
		};
		res.json(result);
	})
);

// The whole show→characters assignment map.
showTemplatesRouter.get(
	'/assignments',
	asyncHandler(async (_req, res) => {
		const assignments = await fetchAssignments();
		res.json({ assignments });
	})
);

// Replace the character assignments for one show. Body: { characterIds: string[] }.
// The show template row is upserted first (from the local collection) so the FK
// holds without a separate sync; the characters, however, must already be synced
// into `character_templates` — an unsynced id trips the FK and returns a 400.
showTemplatesRouter.put(
	'/:showId/characters',
	asyncHandler(async (req, res) => {
		const showId = Number(req.params.showId);
		if (!Number.isInteger(showId)) httpError(400, 'showId must be an integer');

		const body = req.body as { characterIds?: unknown };
		if (!body || !Array.isArray(body.characterIds)) {
			httpError(400, 'Body must be { characterIds: string[] }');
		}
		const characterIds = [...new Set(body.characterIds as unknown[])];
		if (!characterIds.every((id) => typeof id === 'string')) {
			httpError(400, 'characterIds must all be strings');
		}

		// Reject ids that aren't in the local registry up front, with a clearer
		// message than the FK violation would give.
		const known = new Set(characters.map((c) => c.id));
		const unknown = (characterIds as string[]).filter((id) => !known.has(id));
		if (unknown.length > 0) {
			httpError(400, `Unknown character id(s): ${unknown.join(', ')}`);
		}

		// The show must exist in the local collection so we can upsert its name.
		const local = await localTemplates();
		const template = local.find((t) => t.id === showId);
		if (!template) httpError(404, `Show ${showId} is not in the saved collection`);

		const pool = getPool();
		const client = await pool.connect();
		try {
			await client.query('begin');
			await client.query(
				`insert into show_templates (id, name) values ($1, $2)
				 on conflict (id) do update set name = excluded.name, updated_at = now()`,
				[template!.id, template!.name]
			);
			await client.query('delete from show_characters where show_id = $1', [showId]);
			if ((characterIds as string[]).length > 0) {
				await client.query(
					`insert into show_characters (show_id, character_id)
					 select $1::bigint, * from unnest($2::text[])`,
					[showId, characterIds as string[]]
				);
			}
			await client.query('commit');
		} catch (error) {
			await client.query('rollback').catch(() => undefined);
			const message = error instanceof Error ? error.message : String(error);
			// A FK violation here means a character isn't synced to Supabase yet.
			httpError(400, `Could not save assignments: ${message}`);
		} finally {
			client.release();
		}

		res.json({ assignments: await fetchAssignments() });
	})
);
