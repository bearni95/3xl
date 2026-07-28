-- Booster claiming: the server-side enforcement behind the frontend /claim panel.
--
-- Opening a booster pack is gated by two rules that must hold regardless of what
-- the browser does:
--   1. The town must be celebrating a festa major *today* — it must have a row in
--      `festivities` (see festivities.sql) for today's date in Europe/Madrid
--      (Catalan) time.
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
-- today's date, so a grant lapses at Catalan midnight. No RLS/select policy — the
-- anon key never reads it; the security-definer RPCs below do.
create table if not exists public.booster_grants (
	id uuid primary key default gen_random_uuid(),
	user_id uuid not null references auth.users (id) on delete cascade,
	grant_date date not null,
	amount integer not null,
	created_at timestamptz not null default now()
);

create index if not exists booster_grants_user_day_idx
	on public.booster_grants (user_id, grant_date);

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

-- Open a booster pack for the caller, enforced entirely server-side (see header).
-- Rolls 5 cards from the show's assigned, template-backed roster — weighted by
-- rarity (each higher tier 2x rarer) plus a weighted colour (primaries 3/12,
-- secondaries 1/12), matching the @3xl/shared spawn utils — and returns the
-- inserted spawns. A per-user advisory lock serialises
-- concurrent opens so the daily limit can't be raced. security definer: it
-- inserts despite character_spawns having no client insert policy.
create or replace function public.claim_booster(p_show_id bigint, p_location_id text)
returns setof public.character_spawns
language plpgsql security definer set search_path = public as $$
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
	v_row public.character_spawns%rowtype;
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
		select 1 from public.festivities f
		where f.location_id = p_location_id and f.date = v_today
	) then
		raise exception 'This town is not celebrating a festa major today.';
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

	-- Roll pool: characters assigned to the show (any show when null) that exist
	-- as templates, with their rarity tiers.
	with pool as (
		select distinct ct.id as id, coalesce(ct.rarity, 0) as rarity
		from public.show_characters sc
		join public.character_templates ct on ct.id = sc.character_id
		where p_show_id is null or sc.show_id = p_show_id
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
		values (v_uid, p_show_id, p_location_id);

	for i in 1..v_size loop
		-- Weighted-by-rarity character pick (cumulative).
		v_roll := random() * v_total;
		v_pick := v_ids[array_length(v_ids, 1)];
		for j in 1..array_length(v_ids, 1) loop
			v_roll := v_roll - v_weights[j];
			if v_roll < 0 then
				v_pick := v_ids[j];
				exit;
			end if;
		end loop;

		-- Weighted colour: primaries 3/12, secondaries 1/12.
		v_roll := random() * 12;
		v_color := case
			when v_roll < 3 then 'red'
			when v_roll < 6 then 'yellow'
			when v_roll < 9 then 'blue'
			when v_roll < 10 then 'orange'
			when v_roll < 11 then 'green'
			else 'purple'
		end;

		insert into public.character_spawns (user_id, character_id, show_id, location_id, color)
			values (v_uid, v_pick, p_show_id, p_location_id, v_color)
			returning * into v_row;
		return next v_row;
	end loop;

	return;
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
