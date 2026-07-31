-- Booster claiming: the server-side enforcement behind the frontend /claim panel.
--
-- Opening a booster pack is gated by two rules that must hold regardless of what
-- the browser does:
--   1. The town must be celebrating a festa major inside the booster window — it
--      must have a row in `festivities` (see festivities.sql) for a date from 3 days
--      before through 4 days after today in Europe/Madrid (Catalan) time. A festa
--      major runs over its weekend rather than on one evening, so the window is the
--      whole stretch around it; keep it in step with BOOSTER_DAYS_BEHIND /
--      BOOSTER_DAYS_AHEAD in @3xl/shared utils/festes/booster-window.ts, and with the
--      festivity sync's own lower bound (../src/routes/festivities.ts), which must
--      reach at least as far back or the days behind get pruned before anyone can
--      claim them.
--   2. A player may open at most (their level, capped at 20, PLUS any admin-granted
--      extra claims for today) packs per day, the day resetting at midnight
--      Europe/Madrid. Level is derived from the player's accumulated experience via
--      the same D&D 5e table the frontend uses (@3xl/shared utils/progression/
--      level.ts → level_for_exp below); grants come from `booster_grants` (written
--      by the admin /api/users route, see ../src/routes/users.ts), summed for
--      today's Catalan date and added on top of the level.
--
-- Because the frontend talks to Supabase directly with the anon key, these rules
-- live in the database, not the client: `character_spawns` has no insert policy
-- (see character_spawns.sql), so the ONLY way to create spawns is the
-- `claim_booster` security-definer RPC here, which applies both rules atomically.
-- The same is true of `player_avatars` (see player_avatars.sql): a pack grants one
-- avatar alongside its five cards, and that grant is the only way an avatar exists.
--
-- @3xl/backend provisions all of this automatically alongside the other tables
-- (see ../src/routes/show-templates.ts), so you normally do NOT need to run this
-- file — it's kept for reference and for provisioning by hand.
--
-- Idempotent: safe to re-run.

-- Rate-limit ledger: one row per booster pack a player opens. Counting rows here
-- (rather than regrouping character_spawns) drives the daily-limit check. Written
-- only by claim_booster; RLS lets a player read only their own claims.
create table if not exists public.booster_claims (
	id uuid primary key default gen_random_uuid(),
	user_id uuid not null references auth.users (id) on delete cascade,
	show_id bigint references public.show_templates (id) on delete set null,
	location_id text not null,
	claimed_at timestamptz not null default now()
);

create index if not exists booster_claims_user_day_idx
	on public.booster_claims (user_id, claimed_at);

alter table public.booster_claims enable row level security;

-- Admin-granted extra daily claims: an additive, day-scoped bump to a player's
-- booster cap for one Europe/Madrid date. Written only by the admin /api/users
-- route (see ../src/routes/users.ts); claim_booster / boosters_status add the sum
-- of today's grants on top of the level cap. Rows are only ever summed for
-- today's date, so a grant lapses at Catalan midnight. RLS on and no policy at
-- all, which is how a table is made unreachable from the anon key: leaving RLS
-- *off* would not have hidden it but published it, with every verb, since
-- Supabase's default privileges grant anon and authenticated everything on a
-- table in an exposed schema. This is the one ledger that adds straight to a
-- player's daily cap, so a row a browser could write itself is an unbounded
-- supply of packs. The security-definer RPCs below read and write it past RLS;
-- the admin route does so as the owning role, which RLS does not apply to.
create table if not exists public.booster_grants (
	id uuid primary key default gen_random_uuid(),
	user_id uuid not null references auth.users (id) on delete cascade,
	grant_date date not null,
	amount integer not null,
	created_at timestamptz not null default now()
);

create index if not exists booster_grants_user_day_idx
	on public.booster_grants (user_id, grant_date);

alter table public.booster_grants enable row level security;

drop policy if exists booster_claims_select_own on public.booster_claims;
create policy booster_claims_select_own on public.booster_claims
	for select using (auth.uid() = user_id);

-- Player level from an accumulated experience total: the cumulative D&D 5e
-- thresholds, level 20 the cap. Keep in sync with DND_LEVEL_THRESHOLDS /
-- levelForExp in @3xl/shared utils/progression/level.ts.
create or replace function public.level_for_exp(p_exp bigint)
returns int language sql immutable set search_path = public as $$
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
$$;

-- Weighted pick out of a pool: `p_ids` with `p_weights` summing to `p_total`, one
-- id back, the cumulative walk. Its own function because claim_booster draws from
-- the same pool twice — once per card, and once for the avatar — and two copies of
-- a draw are two things to keep in step.
create or replace function public.pick_weighted(
	p_ids text[],
	p_weights numeric[],
	p_total numeric
)
returns text
language plpgsql
volatile
set search_path = public
as $$
declare
	v_roll numeric := random() * p_total;
	j int;
begin
	for j in 1..array_length(p_ids, 1) loop
		v_roll := v_roll - p_weights[j];
		if v_roll < 0 then
			return p_ids[j];
		end if;
	end loop;
	-- Floating-point slack at the very top of the range: the last id is the answer.
	return p_ids[array_length(p_ids, 1)];
end;
$$;

-- Open a booster pack for the caller, enforced entirely server-side (see header).
-- Rolls 5 cards from the town's show — which is the caller's `p_show_id` only while
-- nobody holds the town; once a player has taken it the town deals ITS occupier's
-- team's show, read off `municipality_holders` here (see below) — from that show's
-- assigned, template-backed roster, weighted by
-- rarity (each higher tier 2x rarer), each card taking one of the three colours
-- its box holds — plus ONE avatar (see player_avatars.sql), drawn from those same
-- two possibilities: a character on this show, in one of this box's colours. It
-- returns both.
--
-- Both halves come back in one jsonb object rather than as a row set, because they
-- are two shapes: `{ "spawns": [...], "avatar": {...} }`. (This is why the function
-- is dropped and recreated below — Postgres will not replace a function's return
-- type in place.) An avatar the player already holds is not dealt twice: the insert
-- hands the held row back, so the collection never carries the same portrait twice
-- and the pack still shows what it gave.
--
-- Which box that is, this decides for itself, from the same `festivities` rows the
-- window check above reads: a town celebrating TODAY deals white boxes, which hold
-- the secondaries (purple/green/orange); a town whose festa is past or still to
-- come inside the window deals black ones, which hold the primaries
-- (red/blue/yellow). It is the same white/black the Booster tab prints its tiles
-- on and the map draws its circles in, so what a player is shown is what they get
-- — but the browser is not asked, it is read here, and stamped on every card as
-- `character_spawns.box`. Inside a box the three are equally likely: the rare
-- thing is the white box, there being far fewer towns de festa on any one day than
-- there are across the eight-day window. Keep the triples in step with
-- BOX_SPAWN_COLORS in @3xl/shared utils/spawn/color.ts.
--
-- A per-user advisory lock serialises
-- concurrent opens so the daily limit can't be raced. security definer: it
-- inserts despite character_spawns having no client insert policy.
drop function if exists public.claim_booster(bigint, text);

create or replace function public.claim_booster(p_show_id bigint, p_location_id text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
	v_uid uuid := auth.uid();
	v_today date := (now() at time zone 'Europe/Madrid')::date;
	v_day_start timestamptz := date_trunc('day', now() at time zone 'Europe/Madrid') at time zone 'Europe/Madrid';
	-- The booster window around today (see header).
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
	v_pick text;
	v_color text;
	v_box text;
	v_colors text[];
	v_lead text;
	v_ruling_show bigint;
	v_show_id bigint;
	v_row public.character_spawns%rowtype;
	v_avatar public.player_avatars%rowtype;
	v_spawns jsonb := '[]'::jsonb;
	i int;
begin
	if v_uid is null then
		raise exception 'You must be signed in to open a booster.';
	end if;
	if p_location_id is null or p_location_id = '' then
		raise exception 'A location is required to open a booster.';
	end if;

	-- Serialise this player's opens so the daily limit can't be raced.
	perform pg_advisory_xact_lock(hashtextextended(v_uid::text, 0));

	-- The town must be celebrating a festa major somewhere in the booster window.
	if not exists (
		select 1 from public.festivities f
		where f.location_id = p_location_id
			and f.date between v_today - v_days_behind and v_today + v_days_ahead
	) then
		raise exception 'This town is not celebrating a festa major these days.';
	end if;

	-- Which stock this town's box is printed on, and so which three colours it can
	-- deal: white if its festa is today, black if it is past or still coming.
	if exists (
		select 1 from public.festivities f
		where f.location_id = p_location_id and f.date = v_today
	) then
		v_box := 'white';
		v_colors := array['purple', 'green', 'orange'];
	else
		v_box := 'black';
		v_colors := array['red', 'blue', 'yellow'];
	end if;

	-- Daily cap = player level (>=1, capped at 20) plus any admin-granted extra
	-- claims for today, reset at Catalan midnight.
	select coalesce(exp, 0) into v_exp from public.player_profiles where user_id = v_uid;
	v_level := public.level_for_exp(coalesce(v_exp, 0));
	select coalesce(sum(amount), 0) into v_granted from public.booster_grants
		where user_id = v_uid and grant_date = v_today;
	v_cap := v_level + v_granted;
	select count(*) into v_used from public.booster_claims
		where user_id = v_uid and claimed_at >= v_day_start;
	if v_used >= v_cap then
		raise exception 'Daily booster limit reached: % of % packs opened today. More unlock at midnight.', v_used, v_cap;
	end if;

	-- Which show this town's boxes deal.
	--
	-- A town nobody has taken deals the show its own geometry seeds it with (see
	-- @3xl/shared's utils/geo/municipality-show.ts) — an answer worked out from the
	-- polygons, which exist only in the browser, so that one arrives as p_show_id
	-- and is taken as given. A town
	-- somebody HOLDS deals its occupier's show instead: the sitting team's lead's,
	-- exactly as the map labels the town — and it is read here rather than accepted
	-- from the caller, because which show a conquered town deals is a consequence of
	-- the conquest and not a choice the browser gets to make. It follows the town
	-- automatically: the holder row is rewritten the moment the town changes hands,
	-- and the next pack opened there is already the new show's.
	--
	-- A lead on several shows resolves to the alphabetically first, the same tie the
	-- browser breaks (showIdsByCharacter in @3xl/shared utils/spawn/team-show.ts
	-- walks the shows in name order), so the cover on the box and the pool behind it
	-- name one show. A holder whose lead is on no show leaves the box as the caller
	-- found it, which is the seeded show the map still draws it with.
	v_show_id := p_show_id;
	select h.team->0->>'character_id' into v_lead
		from public.municipality_holders h
		where h.location_id = p_location_id;
	if v_lead is not null then
		select sc.show_id into v_ruling_show
			from public.show_characters sc
			join public.show_templates st on st.id = sc.show_id
			where sc.character_id = v_lead
			order by st.name, sc.show_id
			limit 1;
		v_show_id := coalesce(v_ruling_show, v_show_id);
	end if;

	-- Roll pool: characters assigned to the show (any show when null) that exist
	-- as templates, with their rarity tiers.
	with pool as (
		select distinct ct.id as id, coalesce(ct.rarity, 0) as rarity
		from public.show_characters sc
		join public.character_templates ct on ct.id = sc.character_id
		where v_show_id is null or sc.show_id = v_show_id
	)
	select array_agg(id order by id), array_agg(rarity order by id)
		into v_ids, v_rarities
	from pool;

	if v_ids is null or array_length(v_ids, 1) is null then
		raise exception 'There are no claimable characters for this show.';
	end if;

	-- Selection weights: tier 0 weighs 1, each higher tier 2x rarer.
	select array_agg(w order by ord), sum(w)
		into v_weights, v_total
	from (
		select ord, 1.0 / (2 ^ r) as w
		from unnest(v_rarities) with ordinality as t(r, ord)
	) s;

	-- Record the pack in the rate-limit ledger, then roll its cards.
	insert into public.booster_claims (user_id, show_id, location_id)
		values (v_uid, v_show_id, p_location_id);

	for i in 1..v_size loop
		-- Weighted-by-rarity character pick, then a colour: one of the box's three,
		-- each equally likely.
		v_pick := public.pick_weighted(v_ids, v_weights, v_total);
		v_color := v_colors[1 + floor(random() * array_length(v_colors, 1))];

		insert into public.character_spawns (user_id, character_id, show_id, location_id, color, box)
			values (v_uid, v_pick, v_show_id, p_location_id, v_color, v_box)
			returning * into v_row;
		v_spawns := v_spawns || to_jsonb(v_row);
	end loop;

	-- The pack's avatar: one portrait, drawn exactly as a card is — the same
	-- rarity-weighted pool, the same three colours — because what a box can deal is
	-- what a box can deal, whichever kind of thing comes out of it. A pair the player
	-- already holds is not a second item: the conflict clause touches nothing and
	-- hands back the row they hold, so the pack still has an avatar to show.
	v_pick := public.pick_weighted(v_ids, v_weights, v_total);
	v_color := v_colors[1 + floor(random() * array_length(v_colors, 1))];
	insert into public.player_avatars (user_id, character_id, color, show_id, location_id)
		values (v_uid, v_pick, v_color, v_show_id, p_location_id)
		on conflict (user_id, character_id, color) do update
			set granted_at = player_avatars.granted_at
		returning * into v_avatar;

	return jsonb_build_object('spawns', v_spawns, 'avatar', to_jsonb(v_avatar));
end;
$$;

grant execute on function public.claim_booster(bigint, text) to authenticated;

-- The caller's daily allowance: their effective cap (level plus any admin grants
-- for today), packs opened since Catalan midnight, and how many remain. Powers the
-- claim UI's limit display, so `level` here is the day's cap, not just the exp level.
create or replace function public.boosters_status()
returns table (level int, used int, remaining int)
language plpgsql security definer set search_path = public as $$
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
	select coalesce(exp, 0) into v_exp from public.player_profiles where user_id = v_uid;
	select coalesce(sum(amount), 0) into v_granted from public.booster_grants
		where user_id = v_uid and grant_date = v_today;
	level := public.level_for_exp(coalesce(v_exp, 0)) + v_granted;
	select count(*) into used from public.booster_claims
		where user_id = v_uid and claimed_at >= v_day_start;
	remaining := greatest(0, level - used);
	return next;
end;
$$;

grant execute on function public.boosters_status() to authenticated;

-- Recycle cards: destroy a batch of the caller's own spawns and grant one extra
-- daily claim per full group of 10 destroyed. Cards are worth nothing on their
-- own — the player trades them back for booster claims (an additive
-- `booster_grants` row for today, honoured by claim_booster / boosters_status,
-- lapsing at Catalan midnight). security definer: it writes `booster_grants`,
-- which the anon key can't touch. Takes the same per-user advisory lock as
-- claim_booster so a concurrent claim/recycle can't race the grant.
create or replace function public.recycle_spawns(p_spawn_ids uuid[])
returns table (recycled int, granted int)
language plpgsql security definer set search_path = public as $$
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

	-- Serialise this player's mutations so the grant can't be raced.
	perform pg_advisory_xact_lock(hashtextextended(v_uid::text, 0));

	-- Only the caller's own spawns among those requested are eligible; count them
	-- before deleting so the grant matches exactly what is destroyed.
	select count(*) into v_count from public.character_spawns
		where user_id = v_uid and id = any(p_spawn_ids);
	v_grant := v_count / 10; -- integer division: one claim per full group of 10
	if v_grant < 1 then
		raise exception 'Recycle 10 cards to earn an extra claim; only % selected.', v_count;
	end if;

	delete from public.character_spawns where user_id = v_uid and id = any(p_spawn_ids);
	insert into public.booster_grants (user_id, grant_date, amount)
		values (v_uid, v_today, v_grant);

	recycled := v_count;
	granted := v_grant;
	return next;
end;
$$;

grant execute on function public.recycle_spawns(uuid[]) to authenticated;
