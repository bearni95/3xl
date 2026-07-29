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
 * replaces the assignment list for one show, and `PUT /assignments/:characterId`
 * sets the single show one character belongs to.
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
// the frontend writes it directly with the anon key. That table also carries the
// player's one team, as a `team_slot` on the three cards holding it, written only
// by the `set_team` RPC. `player_profiles` (the
// per-player experience total behind the profile card's level) is provisioned
// here too, along with `combat_results` and the `award_combat_exp` RPC — the
// single path that mutates it, since experience is earned by winning fights and
// nothing else (the old client-driven `add_player_exp` is dropped). Finally,
// `booster_claims` (the per-pack rate-limit ledger) plus the `claim_booster`
// security-definer RPC — the only path that inserts spawns now — enforce the
// daily booster limit (= player level, capped at 20, resetting at midnight
// Europe/Madrid) and the "only towns de festa inside the booster window" rule
// server-side; the client insert policy on `character_spawns` is dropped so the
// rules cannot be bypassed. It reads `festivities` (provisioned lazily by
// ./festivities). `municipality_holders` / `municipality_sieges` (who occupies
// each town on the map, and how far each challenger has got towards taking it)
// round it off — world-readable but written only by award_combat_exp, which
// settles territory in the same transaction as the experience award. Alongside
// them, `municipality_challenges` plus the `start_battle` RPC hold the other
// daily rule: a player may challenge each town once per day, resetting at midnight
// Europe/Madrid like the booster allowance — claimed when the arena opens, settled
// by award_combat_exp, which refuses a second settled report against the same town
// on the same day and hands the day back to everyone whose fight was still open
// when the town changed hands. All DDL is idempotent.
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
						box text,
						created_at timestamptz not null default now()
					);
				alter table character_spawns add column if not exists location_id text;
				alter table character_spawns add column if not exists color text;
				-- The stock the booster box was printed on: 'white' for a town de festa
				-- on the day, 'black' for one whose festa is past or still coming inside
				-- the window. Stamped by claim_booster, which reads it off festivities
				-- rather than taking the browser's word for it, and it is what says which
				-- three colours the card could have been.
				alter table character_spawns add column if not exists box text;
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
				-- Stamp the box on cards claimed before it was recorded, from the claim
				-- itself: the town the card was pulled in and the Catalan day it was pulled
				-- on, against that town's festivity dates — the very question claim_booster
				-- asks now. NOT from the colour: the colours a box deals can change, and a
				-- black box dealing a purple is meant to be allowed, so reading the stock
				-- back off 'purple' would print that card in white ink. Where the claim
				-- cannot answer — a festa whose date has since been pruned out of the
				-- rolling festivities window — the card is black, the commoner stock.
				update character_spawns cs
					set box = case when exists (
							select 1 from festivities f
							where f.location_id = cs.location_id
								and f.date = (cs.created_at at time zone 'Europe/Madrid')::date
						) then 'white' else 'black' end
					where cs.box is null;
				alter table character_spawns drop constraint if exists character_spawns_box_values;
				alter table character_spawns add constraint character_spawns_box_values
					check (box is null or box in ('white', 'black'));
				-- A claimed card once carried a rolled 1..9 gameplay stat as well. Nothing
				-- reads it any more — a fighter's colour is the whole of what it brings to
				-- a fight — so drop the column and the range check that guarded it.
				alter table character_spawns drop constraint if exists character_spawns_stat_range;
				alter table character_spawns drop column if exists stat;
				-- The player's team, kept on the cards themselves: a card is on the team
				-- when it holds a slot, and the slot is the lane it fields in (0 is the
				-- lead). A team was a browser's own list of ids before this, so it was as
				-- many teams as the player had browsers and none of them anything the
				-- server could read. Now it is the cards, so it travels with the account.
				--
				-- One team per player is the unique index, not a rule written anywhere: a
				-- slot is held by at most one of a player's cards and there are only three
				-- slots, so there is only ever one line-up to field.
				alter table character_spawns add column if not exists team_slot smallint;
				alter table character_spawns drop constraint if exists character_spawns_team_slot_range;
				alter table character_spawns add constraint character_spawns_team_slot_range
					check (team_slot is null or (team_slot >= 0 and team_slot < 3));
				create unique index if not exists character_spawns_team_slot_idx
					on character_spawns (user_id, team_slot) where team_slot is not null;
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
				-- The colours that may stand beside a lead of p_color: its own, plus — for a
				-- primary — the compounds that mix it, or — for a compound — the two
				-- primaries that make it. The same relation as teammateColors in
				-- @3xl/shared utils/color/compare.ts; keep the two in step.
				create or replace function teammate_colors(p_color text)
				returns text[] language sql immutable set search_path = public as $teammate_colors$
					select case p_color
						when 'red' then array['red', 'purple', 'orange']
						when 'blue' then array['blue', 'purple', 'green']
						when 'yellow' then array['yellow', 'orange', 'green']
						when 'purple' then array['purple', 'red', 'blue']
						when 'orange' then array['orange', 'red', 'yellow']
						when 'green' then array['green', 'blue', 'yellow']
						else array[p_color]
					end;
				$teammate_colors$;
				-- Set the caller's team: p_team is the three slots in fielded order, as spawn
				-- ids with null for an empty one. It replaces whatever they had — there is one
				-- team, so saving a line-up is saving THE line-up.
				--
				-- security definer because character_spawns takes no client update at all;
				-- this writes exactly one column, on rows the caller owns, and it is the only
				-- path to it. What it proves is what start_battle would otherwise discover far
				-- too late: the cards are the caller's, each named once, and every one of them
				-- shares a colour with the lead (see teammate_colors) — so a team that could
				-- never fight is refused where it is built rather than at the door of a fight.
				create or replace function set_team(p_team jsonb)
				returns void language plpgsql security definer set search_path = public as $set_team$
				declare
						v_uid uuid := auth.uid();
						v_size constant int := 3;
						v_ids uuid[];
						v_named int;
						v_given int;
						v_distinct int;
						v_owned int;
						v_lead_color text;
						v_mismatched int;
				begin
						if v_uid is null then
								raise exception 'You must be signed in to field a team.';
						end if;
						if p_team is null or jsonb_typeof(p_team) <> 'array'
							or jsonb_array_length(p_team) <> v_size then
								raise exception 'A team is a line-up of % slots.', v_size;
						end if;
						-- The slots, in order. An id is cast only where it looks like a uuid, so
						-- junk in a slot is answered with the rule it broke rather than with a
						-- cast error about the shape of a uuid.
						select array_agg(
									case when e.value ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
										then e.value::uuid end
									order by e.ord),
								count(*) filter (where e.value is not null)
							into v_ids, v_named
							from jsonb_array_elements_text(p_team) with ordinality as e(value, ord);
						select count(*), count(distinct x) into v_given, v_distinct
							from unnest(v_ids) as x where x is not null;
						if v_given <> v_named then
								raise exception 'A team slot holds one of your cards, or nothing.';
						end if;
						if v_distinct <> v_given then
								raise exception 'A fighter cannot be fielded twice.';
						end if;
						-- Serialise this player's mutations, matching claim_booster / recycle_spawns.
						perform pg_advisory_xact_lock(hashtextextended(v_uid::text, 0));
						select count(*) into v_owned from character_spawns
							where user_id = v_uid and id = any(v_ids);
						if v_owned <> v_given then
								raise exception 'Every fighter must be one of your own claimed cards.';
						end if;
						-- The lead is the first slot, and it is the lead that says what the rest of
						-- the team may be, so a team with no lead is a team with nobody behind it.
						select cs.color into v_lead_color from character_spawns cs
							where cs.user_id = v_uid and cs.id = v_ids[1];
						if v_lead_color is null and v_given > 0 then
								raise exception 'A team is led by its first card; fill that slot first.';
						end if;
						if v_lead_color is not null then
								select count(*) into v_mismatched from character_spawns cs
									where cs.user_id = v_uid and cs.id = any(v_ids[2:])
										and not (cs.color = any(teammate_colors(v_lead_color)));
								if v_mismatched > 0 then
										raise exception 'Every fighter must share a colour with the team lead.';
								end if;
						end if;
						-- Cleared first, so the line-up being saved never collides with the one it
						-- replaces over a slot they both use.
						update character_spawns set team_slot = null
							where user_id = v_uid and team_slot is not null;
						update character_spawns cs set team_slot = s.slot
							from (
								select (i - 1)::smallint as slot, v_ids[i] as spawn_id
								from generate_subscripts(v_ids, 1) as i
							) s
							where cs.user_id = v_uid and cs.id = s.spawn_id;
				end;
				$set_team$;
				grant execute on function set_team(jsonb) to authenticated;
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
				-- arbitrary string, and the caller must have *earned* the portrait: they
				-- need a card of that character in each of the six spawn colours (see
				-- SpawnColor in @3xl/shared). That check lives here rather than in the
				-- browser, so a crafted call cannot wear an uncollected face.
				create or replace function set_player_avatar(p_character_id text)
				returns text language plpgsql security definer set search_path = public as $set_player_avatar$
				declare
						v_uid uuid := auth.uid();
						v_colors int;
				begin
						if v_uid is null then
								raise exception 'You must be signed in to choose an avatar.';
						end if;
						if p_character_id is not null and not exists (
								select 1 from character_templates t where t.id = p_character_id
						) then
								raise exception 'Unknown character: %', p_character_id;
						end if;
						if p_character_id is not null then
								select count(distinct cs.color) into v_colors
								from character_spawns cs
								where cs.user_id = v_uid
									and cs.character_id = p_character_id
									and cs.color in ('red', 'yellow', 'blue', 'orange', 'green', 'purple');
								if v_colors < 6 then
										raise exception 'Collect this character in all six colours to wear its portrait.';
								end if;
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
					--   * the town (p_location_id) must be celebrating a festa major inside
					--     the booster window — a festivities row for a Catalan date from 3
					--     days back through 4 days ahead of today (a festa major runs over
					--     its weekend, not one evening); keep in step with
					--     @3xl/shared utils/festes/booster-window.ts and with the festivity
					--     sync's lower bound in ./festivities.ts;
					--   * the player may open at most (their level, capped at 20) packs per
					--     day, the day resetting at midnight Europe/Madrid.
					-- It then rolls 5 cards from the show's assigned, template-backed roster
					-- (weighted by rarity), each taking one of the three colours its box
					-- holds, and returns the inserted spawns.
					--
					-- Which box that is, it decides itself from the same festivities rows the
					-- window check reads: a town celebrating TODAY deals white boxes, holding
					-- the secondaries (purple/green/orange); a town whose festa is past or
					-- still to come inside the window deals black ones, holding the primaries
					-- (red/blue/yellow). The same white/black the Booster tab prints its tiles
					-- on and the map draws its circles in — but read here, not taken from the
					-- browser, and stamped on every card as character_spawns.box. Inside a box
					-- the three are equally likely: the rare thing is the white box, there
					-- being far fewer towns de festa on a given day than across the window.
					-- Keep the triples in step with BOX_SPAWN_COLORS in
					-- @3xl/shared utils/spawn/color.ts.
					-- A per-user advisory lock serialises
					-- concurrent opens so the limit can't be raced. security definer: it
					-- inserts despite character_spawns now having no client insert policy.
					create or replace function claim_booster(p_show_id bigint, p_location_id text)
					returns setof character_spawns
					language plpgsql security definer set search_path = public as $claim_booster$
					declare
							v_uid uuid := auth.uid();
							v_today date := (now() at time zone 'Europe/Madrid')::date;
							v_day_start timestamptz := date_trunc('day', now() at time zone 'Europe/Madrid') at time zone 'Europe/Madrid';
							-- The booster window around today (see the comment above).
							v_days_behind constant int := 3;
							v_days_ahead constant int := 4;
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
							v_box text;
							v_colors text[];
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
							-- The town must be celebrating a festa major inside the booster window.
							if not exists (
									select 1 from festivities f
									where f.location_id = p_location_id
											and f.date between v_today - v_days_behind and v_today + v_days_ahead
							) then
									raise exception 'This town is not celebrating a festa major these days.';
							end if;
							-- Which stock this town's box is printed on, and so which three
							-- colours it can deal: white if its festa is today, black if it is
							-- past or still coming.
							if exists (
									select 1 from festivities f
									where f.location_id = p_location_id and f.date = v_today
							) then
									v_box := 'white';
									v_colors := array['purple', 'green', 'orange'];
							else
									v_box := 'black';
									v_colors := array['red', 'blue', 'yellow'];
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
									-- Colour: one of the box's three, each equally likely.
									v_color := v_colors[1 + floor(random() * array_length(v_colors, 1))];
									insert into character_spawns (user_id, character_id, show_id, location_id, color, box)
											values (v_uid, v_pick, p_show_id, p_location_id, v_color, v_box)
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
							-- Fighters left standing at the end / fielded at the start, as counted here.
							survivors integer not null default 0,
							fielded integer not null default 0,
							-- The level whose span was at stake, and the span itself.
							level integer not null,
							level_span bigint not null,
							-- Experience actually awarded (0 for anything but a win).
							exp_awarded bigint not null,
							fought_at timestamptz not null default now()
						);
					-- Fights recorded while the award was weighed by compound HP carried
					-- hp_left/hp_max instead. The two are not the same measure, so the columns are
					-- replaced rather than renamed: an old row keeps the award it actually paid and
					-- reads as 0 of 0 fighters, which is honestly "not recorded".
					alter table combat_results add column if not exists survivors integer not null default 0;
					alter table combat_results add column if not exists fielded integer not null default 0;
					alter table combat_results drop column if exists hp_left;
					alter table combat_results drop column if exists hp_max;
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
							-- [{"character_id": text, "color": text}, …] in fielded order.
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
					-- One challenge per player per town per Catalan day: the pacing behind the
					-- siege bar. Taking a town needs turnover + 1 wins, which only means
					-- something if the same town can't be refought until they land — so a row
					-- here IS the limit, and its mere existence for today's date closes the
					-- town off until midnight Europe/Madrid, whatever the fight's outcome was
					-- or whether it was ever finished. The day is spent when the arena opens
					-- (start_battle below), not when the fight is reported: a fight
					-- abandoned halfway still used it up, which is exactly what stops a
					-- player restarting a fight that was going badly. The one exception is a
					-- slot voided by somebody else taking the town mid-fight — see voided_at.
					-- No client write path; start_battle and award_combat_exp are the only
					-- writers, and a player reads only their own rows.
					create table if not exists municipality_challenges (
							user_id uuid not null references auth.users (id) on delete cascade,
							location_id text not null,
							challenge_date date not null
								default (now() at time zone 'Europe/Madrid')::date,
							started_at timestamptz not null default now(),
							-- When the fight was reported, or null while it is still open. The day
							-- is spent either way; this only tells award_combat_exp whether a
							-- report against this slot is the first one.
							settled_at timestamptz,
							-- When this slot was handed back because the town changed hands while
							-- the fight was still open: paid for, never really fought. A voided
							-- slot stops blocking and start_battle revives it in place. Kept
							-- rather than deleted so the late report of that fight settles this
							-- row instead of claiming a fresh day.
							voided_at timestamptz,
							primary key (user_id, location_id, challenge_date)
						);
					alter table municipality_challenges add column if not exists voided_at timestamptz;
					alter table municipality_challenges enable row level security;
					drop policy if exists municipality_challenges_select_own on municipality_challenges;
					create policy municipality_challenges_select_own on municipality_challenges
							for select using (auth.uid() = user_id);
					-- The open battle: the one fight a player may have running at a time. A
					-- fight is not the browser's — picking one on the map opens a row here,
					-- each closed turn writes the board back to it, and reporting the result
					-- deletes it. The primary key is the player, so the rule IS the table:
					-- one open battle, ever. Closing the arena, reloading or moving to
					-- another device neither loses the fight nor gets out of it, which is
					-- what stops a player walking away from one that is going badly (the
					-- daily challenge only ever stopped them refighting the same town).
					-- The row is also the server's record of WHAT is being fought — town,
					-- turnover, rival line-up — all fixed at open and read from here by
					-- award_combat_exp rather than believed from the report. Only the board
					-- column is the browser's, and nothing is derived from it.
					create table if not exists battles (
							user_id uuid primary key references auth.users (id) on delete cascade,
							location_id text not null,
							challenge_date date not null
								default (now() at time zone 'Europe/Madrid')::date,
							-- The generation of the team being fought, so a fight that outlived a
							-- capture is recognisable as stale.
							turnover integer not null default 0,
							-- The rival line-up in lane order, [{character_id, color}], frozen so a
							-- resumed fight faces the same three whatever the town has done since.
							rivals jsonb not null default '[]'::jsonb,
							-- The player's own line-up in fielded order, [spawn_id, …], every one
							-- of them checked against character_spawns before this row existed.
							team jsonb not null default '[]'::jsonb,
							-- The board as the last closed turn left it, null before the first.
							board jsonb,
							started_at timestamptz not null default now(),
							updated_at timestamptz not null default now()
						);
					-- Battles opened before the team was proved simply carry none.
					alter table battles add column if not exists team jsonb not null default '[]'::jsonb;
					alter table battles enable row level security;
					-- Read your own and nothing else. Deliberately no write policy at all: a
					-- client that could delete this row could walk out of a losing fight.
					drop policy if exists battles_select_own on battles;
					create policy battles_select_own on battles
							for select using (auth.uid() = user_id);
					-- Open a battle over a town, called when the arena opens. Replaces
					-- start_challenge: it spends the town's challenge for the Catalan day
					-- (reviving a slot voided by somebody taking the town mid-fight) AND opens
					-- the battle in the same transaction, so the day is never spent on a fight
					-- that failed to start, and never spent without a battle answering for it.
					-- Refuses a town the caller holds, and refuses outright when they already
					-- have a battle open — that one has to be finished first. The OUT names
					-- deliberately avoid the table's columns.
					--
					-- The line-up is no longer the caller's to name: it is read here off the
					-- team slots on the caller's own cards (see set_team), so a fight is opened
					-- with the team the ACCOUNT holds rather than with whatever list a browser
					-- arrived carrying — one that could name cards claimed by another account
					-- or recycled since. Three slots have to be filled or no battle is opened
					-- and no day is spent, which is the same rule award_combat_exp applies to a
					-- winning report, kept in the only place it does the player any good: a
					-- fight that could never have been reported is a fight that was never
					-- started. The line-up is returned as well as stored, so the arena fields
					-- exactly what the server wrote down.
					--
					-- Both older signatures are dropped rather than replaced: left standing
					-- they would make every call ambiguous for PostgREST and go on being a way
					-- to open a battle with a line-up of the client's own choosing.
					drop function if exists start_battle(text, int, jsonb);
					drop function if exists start_battle(text, int, jsonb, jsonb);
					create or replace function start_battle(
						p_location_id text,
						p_turnover int default 0,
						p_rivals jsonb default '[]'::jsonb
					)
					returns table (
						town_id text,
						challenge_day date,
						opened_at timestamptz,
						fielded_team jsonb
					)
					language plpgsql security definer set search_path = public as $start_battle$
					declare
						v_uid uuid := auth.uid();
						v_today date := (now() at time zone 'Europe/Madrid')::date;
						v_holder uuid;
						v_started timestamptz;
						v_open text;
						v_team jsonb;
						v_fielded int;
					begin
						if v_uid is null then
							raise exception 'You must be signed in to challenge a town.';
						end if;
						if p_location_id is null or p_location_id = '' then
							raise exception 'A town is required to start a challenge.';
						end if;
						-- Serialise this player's mutations, matching claim_booster. It holds the
						-- team still as well: no slot can be re-dealt between being read here and
						-- the battle being written with it.
						perform pg_advisory_xact_lock(hashtextextended(v_uid::text, 0));
						-- The caller's team, in slot order — the lead first, as the board fields it.
						select coalesce(jsonb_agg(cs.id::text order by cs.team_slot), '[]'::jsonb),
								count(*)
							into v_team, v_fielded
							from character_spawns cs
							where cs.user_id = v_uid and cs.team_slot is not null;
						-- Three a side, the size award_combat_exp caps a report at.
						if v_fielded <> 3 then
							raise exception 'A team fields 3 fighters; yours has %. Finish it on your roster.', v_fielded;
						end if;
						-- One battle at a time. The map offers the way back into the open one,
						-- never a second, so a call that gets here has lost track of its own
						-- fight or is trying to leave it behind.
						select b.location_id into v_open from battles b where b.user_id = v_uid;
						if v_open is not null then
							raise exception 'You already have a battle in progress. Finish it before starting another.';
						end if;
						select h.user_id into v_holder from municipality_holders h
							where h.location_id = p_location_id;
						if v_holder is not null and v_holder = v_uid then
							raise exception 'You already hold this town — you cannot challenge your own team.';
						end if;
						insert into municipality_challenges (user_id, location_id, challenge_date)
							values (v_uid, p_location_id, v_today)
							on conflict (user_id, location_id, challenge_date) do update
								set started_at = now(), settled_at = null, voided_at = null
								where municipality_challenges.voided_at is not null
							returning municipality_challenges.started_at into v_started;
						if v_started is null then
							raise exception 'You have already challenged this town today. New challenges at midnight.';
						end if;
						insert into battles
							(user_id, location_id, challenge_date, turnover, rivals, team, board)
							values (v_uid, p_location_id, v_today,
								greatest(0, coalesce(p_turnover, 0)),
								coalesce(p_rivals, '[]'::jsonb), v_team, null);
						town_id := p_location_id;
						challenge_day := v_today;
						opened_at := v_started;
						fielded_team := v_team;
						return next;
					end;
					$start_battle$;
					grant execute on function start_battle(text, int, jsonb) to authenticated;
					-- The pre-battle RPC is dropped rather than left standing: a client that
					-- could still claim a day's challenge without opening a battle would have a
					-- way to spend the day with nothing holding it to the fight.
					drop function if exists start_challenge(text);
					-- Write the board back, called as each turn closes — the only mutable part
					-- of a battle and the only thing the browser authors. A save that finds no
					-- open battle does nothing: it raced the report that ended the fight, which
					-- is late rather than wrong.
					create or replace function save_battle(p_board jsonb)
					returns void
					language plpgsql security definer set search_path = public as $save_battle$
					declare
							v_uid uuid := auth.uid();
					begin
							if v_uid is null then
								raise exception 'You must be signed in to play a battle.';
							end if;
							update battles set board = p_board, updated_at = now()
								where user_id = v_uid;
					end;
					$save_battle$;
					grant execute on function save_battle(jsonb) to authenticated;
					-- Both earlier signatures are dropped rather than replaced: leaving either
					-- in place would give PostgREST overloads to choose between and make every
					-- rpc('award_combat_exp') call ambiguous — and the four-argument one is
					-- exactly the version that let the client name its own town and turnover.
					drop function if exists award_combat_exp(text, jsonb);
					drop function if exists award_combat_exp(text, jsonb, text, int);
					-- Award experience for one finished fight:
					--   * a loss or a draw earns nothing;
					--   * a win earns a share of the player's CURRENT level's full span (see
					--     level_span_exp), scaled linearly by how much of their team is left
					--     standing: survivors / fielded. A flawless win — nobody taken down —
					--     earns the entire span, i.e. one whole level's worth measured from the
					--     base of the level; a win with one of three left earns a third of it.
					-- Combat runs in the browser, so the report is treated as a claim and bounded
					-- rather than trusted: every spawn must belong to the caller, the team is
					-- counted here rather than read from the report (at most 3, each named once),
					-- and the amount itself is never sent by the client — it is derived here from
					-- the player's stored experience. p_fighters is the player's side only, as
					-- [{"spawn_id": uuid, "down": boolean}]. The OUT names
					-- deliberately avoid the column names used in the body. security definer: it
					-- writes player_profiles and combat_results, neither client-writable.
					--
					-- A report is only ever accepted against an OPEN BATTLE, and the battle
					-- row is what says which town was fought and which generation of its team
					-- — neither is taken from the report, so a browser cannot pick a richer
					-- town to have won nor pass off a fight against a superseded occupant as
					-- one against the team sitting there now. Reporting also ends the battle:
					-- the row is deleted here, and only then may another be started.
					--
					-- It settles TERRITORY in the same transaction, over that town:
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
							p_fighters jsonb
						)
					returns table (
							awarded_exp bigint,
							total_exp bigint,
							at_level int,
							span_exp bigint,
							team_survivors int,
							team_fielded int,
							-- The town is returned rather than echoed from the report, which no
							-- longer names one.
							town_id text,
							town_captured boolean,
							town_wins int,
							town_required int,
							town_turnover int,
							town_stale boolean
						)
					language plpgsql security definer set search_path = public as $award_combat_exp$
					declare
							v_uid uuid := auth.uid();
							v_today date := (now() at time zone 'Europe/Madrid')::date;
							v_challenge timestamptz;
							v_reported int;
							v_distinct int;
							v_owned int;
							v_exp bigint;
							v_level int;
							v_span bigint;
							v_standing int;
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
							-- The battle being reported: the town and the generation as the server
							-- recorded them when the fight was opened.
							v_location text;
							v_fought int;
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
							-- The fight has to be one the server opened. Everything about WHAT was
							-- fought comes from here, not from the report; a report with no battle
							-- behind it is not a fight that happened but a claim about one.
							select b.location_id, b.turnover into v_location, v_fought
								from battles b where b.user_id = v_uid;
							if v_location is null then
								raise exception 'You have no battle in progress to report.';
							end if;
							-- The reported team, bounded against what the caller actually owns. A fighter
							-- is standing or it is down, so the survivors are simply counted over the
							-- fighters that turned out to be the caller's own.
							with reported as (
								select f.spawn_id, coalesce(f.down, false) as down
								from jsonb_to_recordset(p_fighters)
									as f(spawn_id uuid, down boolean)
							),
							owned as (
								select r.down
								from reported r
								join character_spawns cs on cs.id = r.spawn_id and cs.user_id = v_uid
							)
							select
								(select count(*) from reported),
								(select count(distinct spawn_id) from reported),
								(select count(*) from owned),
								(select count(*) from owned where not down)
							into v_reported, v_distinct, v_owned, v_standing;
							-- The report is bounded where it can buy something, and only there. A
							-- win pays experience and banks ground, so it has to name a real team.
							-- A loss or a draw buys nothing at all — no experience, no siege, no
							-- town — and its only effect is closing the battle, so it is always
							-- taken. Refusing one protects nothing and strands the player in a
							-- fight they have already given up.
							if p_outcome = 'win' then
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
							end if;
							-- The level at stake is the one the player is on now, before the award.
							select coalesce(exp, 0) into v_exp from player_profiles where user_id = v_uid;
							v_exp := coalesce(v_exp, 0);
							v_level := level_for_exp(v_exp);
							v_span := level_span_exp(v_level);
							if p_outcome = 'win' and v_span > 0 and v_owned > 0 then
								v_award := round(v_span::numeric * v_standing::numeric / v_owned::numeric);
							else
								v_award := 0;
							end if;
							insert into combat_results
								(user_id, outcome, survivors, fielded, level, level_span, exp_awarded)
								values (v_uid, p_outcome, v_standing, v_owned, v_level, v_span, v_award);
							if v_award > 0 then
								insert into player_profiles (user_id, exp)
									values (v_uid, v_award)
									on conflict (user_id) do update
										set exp = player_profiles.exp + v_award, updated_at = now()
									returning exp into v_total;
							else
								v_total := v_exp;
							end if;
							-- Territory. Every battle is over a town, so this always runs.
							begin
								-- Serialise per town, so two challengers finishing at the same moment
								-- can't both read the same turnover and both take it.
								perform pg_advisory_xact_lock(hashtextextended('municipality:' || v_location, 0));
								select h.user_id, h.turnover into v_holder, v_turnover
									from municipality_holders h where h.location_id = v_location;
								-- A town whose sitting team is the caller's own cannot be fought for:
								-- there is nothing to take off yourself. The map never offers the
								-- challenge, so a report that names one did not come from the game —
								-- reject it outright, rolling back the experience with it, rather than
								-- paying out for a fight that should not have happened.
								-- Only a WIN is refused for it: there is nothing to take off
								-- yourself. A loss against your own town is a fight that ends.
								if v_holder is not null and v_holder = v_uid and p_outcome = 'win' then
									raise exception 'You already hold this town — you cannot challenge your own team.';
								end if;
								-- One challenge per town per Catalan day. The slot is normally already
								-- open (start_battle claimed it when the battle opened) and settling
								-- it here closes it; a report against a slot already settled is a
								-- second fight against the same town today, so it is rejected outright,
								-- rolling back the experience with it. There is no longer a way to
								-- arrive with no slot at all: the battle being reported could not have
								-- been opened without one. A slot voided below (the town changed hands
								-- mid-fight) settles here like any other — the fight happened and is
								-- paid for — but keeps its voided_at, which carries the refund past
								-- this report.
								insert into municipality_challenges
									(user_id, location_id, challenge_date, settled_at)
									values (v_uid, v_location, v_today, now())
									on conflict (user_id, location_id, challenge_date) do update
										set settled_at = now()
										where municipality_challenges.settled_at is null
									returning municipality_challenges.settled_at into v_challenge;
								-- Again the win only: a second win against the same town today
								-- would be a second payout, a second loss is worth what the
								-- first was, which is nothing.
								if v_challenge is null and p_outcome = 'win' then
									raise exception 'You have already challenged this town today. New challenges at midnight.';
								end if;
								-- No row at all means the town is still on its seeded OG team: turnover 0.
								v_turnover := coalesce(v_turnover, 0);
								v_required := greatest(1, v_turnover + 1);
								-- The generation the battle was opened against against the one sitting
								-- there now: if the town flipped since, what was beaten was not the
								-- sitting team and the win buys nothing. Both numbers are the server's.
								v_stale := coalesce(v_fought, 0) <> v_turnover;
								if p_outcome = 'win' and not v_stale then
									-- Bank the win. A stored siege from an older generation is not added
									-- to — it restarts at this win, since it was earned against a team
									-- that no longer sits there.
									insert into municipality_sieges (location_id, user_id, wins, turnover)
										values (v_location, v_uid, 1, v_turnover)
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
													'color', cs.color
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
											values (v_location, v_uid, v_name, coalesce(v_team, '[]'::jsonb),
												v_turnover + 1, now())
											on conflict (location_id) do update
												set user_id = excluded.user_id,
													holder_name = excluded.holder_name,
													team = excluded.team,
													turnover = excluded.turnover,
													taken_at = excluded.taken_at;
										-- A new generation voids every siege on the town, the winner's included.
										delete from municipality_sieges where location_id = v_location;
										-- And every fight still open against the old one: those challengers
										-- are beating a team that no longer sits here and their report will
										-- be refused as stale, so the day they spent on this town is handed
										-- back rather than burnt on a fight this capture took away. Marked,
										-- not deleted — their late report settles this row (paid for, no
										-- ground banked) and the voided flag it keeps is what lets them come
										-- straight back at the new occupant today. Slots already settled are
										-- left alone: those were spent on a real fight against the team that
										-- was sitting here at the time.
										update municipality_challenges
											set voided_at = now()
											where location_id = v_location
												and challenge_date = v_today
												and settled_at is null
												and voided_at is null
												and user_id <> v_uid;
										v_captured := true;
										v_turnover := v_turnover + 1;
										v_wins := v_required;
									end if;
								else
									-- Nothing banked (a loss, a draw or a stale fight): report the
									-- progress they already had against this generation.
									select s.wins into v_wins from municipality_sieges s
										where s.location_id = v_location
											and s.user_id = v_uid
											and s.turnover = v_turnover;
									v_wins := coalesce(v_wins, 0);
								end if;
								town_id := v_location;
								town_captured := v_captured;
								town_wins := v_wins;
								town_required := v_required;
								town_turnover := v_turnover;
								town_stale := v_stale;
							end;
							-- The fight is over: close the battle, freeing the player to start
							-- another. Every rejection above raises, which rolls this back with the
							-- experience — a refused report leaves them in the battle they were in.
							delete from battles where user_id = v_uid;
							awarded_exp := v_award;
							total_exp := coalesce(v_total, v_exp);
							at_level := v_level;
							span_exp := v_span;
							team_survivors := v_standing;
							team_fielded := v_owned;
							return next;
					end;
					$award_combat_exp$;
					grant execute on function award_combat_exp(text, jsonb) to authenticated`
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

// Set which show one character belongs to. Body: { showId: number | null } —
// null clears it, leaving the character unassigned.
//
// The sibling PUT below replaces a whole show's cast, which is what the /shows
// screen edits; this is the same join read from the character's side, which is
// what a per-character row edits. Doing it as one call rather than two cast
// rewrites keeps the move atomic (a character is never in both shows or neither)
// and never touches the rest of either cast.
//
// A character belongs to a single show here, so its existing rows are dropped
// whichever show they name. Both referenced rows are upserted first, from the
// local sources of truth, so an assignment works before an explicit sync has
// pushed either up.
showTemplatesRouter.put(
	'/assignments/:characterId',
	asyncHandler(async (req, res) => {
		const characterId = String(req.params.characterId);
		const character = characters.find((c) => c.id === characterId);
		if (!character) httpError(404, `No local character "${characterId}"`);

		const raw = (req.body as { showId?: unknown }).showId;
		if (raw !== null && !Number.isInteger(raw)) {
			httpError(400, 'Body must be { showId: number | null }');
		}
		const showId = raw === null ? null : Number(raw);

		// The show must exist in the local collection so we can upsert its name.
		let template: ShowTemplate | undefined;
		if (showId !== null) {
			template = (await localTemplates()).find((t) => t.id === showId);
			if (!template) httpError(404, `Show ${showId} is not in the saved collection`);
		}

		await ensureTables();
		const client = await getPool().connect();
		try {
			await client.query('begin');
			await client.query(
				`insert into character_templates (id, name) values ($1, $2)
				 on conflict (id) do update set name = excluded.name, updated_at = now()`,
				[characterId, character!.label]
			);
			await client.query('delete from show_characters where character_id = $1', [characterId]);
			if (template) {
				await client.query(
					`insert into show_templates (id, name) values ($1, $2)
					 on conflict (id) do update set name = excluded.name, updated_at = now()`,
					[template.id, template.name]
				);
				await client.query(
					'insert into show_characters (show_id, character_id) values ($1::bigint, $2)',
					[template.id, characterId]
				);
			}
			await client.query('commit');
		} catch (error) {
			await client.query('rollback').catch(() => undefined);
			const message = error instanceof Error ? error.message : String(error);
			httpError(400, `Could not save assignment: ${message}`);
		} finally {
			client.release();
		}

		res.json({ assignments: await fetchAssignments() });
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
