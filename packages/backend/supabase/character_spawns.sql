-- Character spawns: per-player claimed instances of a character. Each row links
-- a Supabase auth user to a character template (and the show it was rolled from)
-- and is created by the frontend /claim panel, where a signed-in player spawns a
-- random character drawn from a show's assigned roster (`show_characters`).
--
-- Unlike the other template tables, this one is written directly by the frontend
-- with the anon key (RLS-gated), not by @3xl/backend. @3xl/backend still creates
-- it automatically alongside `show_templates`/`show_characters` (see
-- ../src/routes/show-templates.ts), so you normally do NOT need to run this file
-- — it's kept for reference and for provisioning the table by hand.
--
-- Idempotent: safe to re-run.

create table if not exists public.character_spawns (
	id uuid primary key default gen_random_uuid(),
	user_id uuid not null references auth.users (id) on delete cascade,
	character_id text not null references public.character_templates (id) on delete cascade,
	show_id bigint references public.show_templates (id) on delete set null,
	-- Municipality the spawn was claimed in, as a geojson feature id (e.g. ES_08028)
	-- resolved from the player's browser location. The frontend requires it on claim.
	location_id text,
	-- Spawn colour, one of the three its box holds (see `box` below).
	color text,
	-- The stock the booster box was printed on: 'white' for a town de festa on the
	-- day, 'black' for one whose festa is past or still coming inside the booster
	-- window. Stamped by claim_booster, which decides it from `festivities` rather
	-- than taking the browser's word for it, and it is what says which three
	-- colours the card could have been.
	box text,
	created_at timestamptz not null default now()
);

-- Backfill the columns on tables provisioned before they existed.
alter table public.character_spawns add column if not exists location_id text;
alter table public.character_spawns add column if not exists color text;
alter table public.character_spawns add column if not exists box text;

-- A claimed card once carried a rolled 1..9 gameplay stat as well. Nothing reads it
-- any more — a fighter's colour is the whole of what it brings to a fight — so the
-- column goes, along with the range check that guarded it.
alter table public.character_spawns drop constraint if exists character_spawns_stat_range;
alter table public.character_spawns drop column if exists stat;

-- The player's team, kept on the cards themselves: a card is on the team when it
-- holds a slot, and the slot is the lane it fields in (0 is the lead). A team was
-- a browser's own list of ids before this, so it was as many teams as the player
-- had browsers and none of them anything the server could read. Now it is the
-- cards, so it travels with the account.
--
-- One team per player is the unique index, not a rule written anywhere: a slot is
-- held by at most one of a player's cards and there are only three slots, so there
-- is only ever one line-up to field.
alter table public.character_spawns add column if not exists team_slot smallint;
alter table public.character_spawns drop constraint if exists character_spawns_team_slot_range;
alter table public.character_spawns add constraint character_spawns_team_slot_range
	check (team_slot is null or (team_slot >= 0 and team_slot < 3));
create unique index if not exists character_spawns_team_slot_idx
	on public.character_spawns (user_id, team_slot) where team_slot is not null;

-- Assign a weighted colour to any pre-existing rows that lack one.
update public.character_spawns cs set color = pick.color
from (
	select id, case
		when r < 3.0 / 12 then 'red'
		when r < 6.0 / 12 then 'yellow'
		when r < 9.0 / 12 then 'blue'
		when r < 10.0 / 12 then 'orange'
		when r < 11.0 / 12 then 'green'
		else 'purple'
	end as color
	from (select id, random() as r from public.character_spawns where color is null) seeded
) pick
where cs.id = pick.id;

-- Stamp the box on cards claimed before it was recorded, from the claim itself: the
-- town the card was pulled in and the Catalan day it was pulled on, against that
-- town's festivity dates — which is the very question claim_booster asks now.
--
-- NOT from the colour. The colours a box deals are a rule that can change, and this
-- game means to let a black box deal a purple; a card's box is where it was claimed,
-- and reading it back off `purple` would print such a card in white ink. Where the
-- claim cannot answer — a festa whose date has since been pruned out of
-- `festivities`, which only holds a rolling window — the card is black, the commoner
-- stock, rather than a guess dressed up as a record.
update public.character_spawns cs
	set box = case when exists (
			select 1 from public.festivities f
			where f.location_id = cs.location_id
				and f.date = (cs.created_at at time zone 'Europe/Madrid')::date
		) then 'white' else 'black' end
	where cs.box is null;

alter table public.character_spawns drop constraint if exists character_spawns_box_values;
alter table public.character_spawns add constraint character_spawns_box_values
	check (box is null or box in ('white', 'black'));

-- Row-level security: a player may read and delete their own spawns. `auth.uid()`
-- resolves from the caller's JWT (the browser anon client sends the signed-in
-- user's token).
--
-- There is deliberately NO insert policy: spawns are created only by the
-- `claim_booster` security-definer RPC (see booster_claims.sql), which enforces
-- the daily limit and the festa-major-today rule server-side. A client holding
-- the anon key therefore cannot insert arbitrary spawns — only earn them through
-- a valid claim. (Earlier revisions had a `character_spawns_insert_own` policy;
-- it is dropped there.)
alter table public.character_spawns enable row level security;

drop policy if exists character_spawns_select_own on public.character_spawns;
create policy character_spawns_select_own on public.character_spawns
	for select using (auth.uid() = user_id);

drop policy if exists character_spawns_insert_own on public.character_spawns;

drop policy if exists character_spawns_delete_own on public.character_spawns;
create policy character_spawns_delete_own on public.character_spawns
	for delete using (auth.uid() = user_id);

-- There is no update policy either, which is what makes `team_slot` the server's
-- column: the team is set only through the RPC below.

-- The colours that may stand beside a lead of `p_color`: its own, plus — for a
-- primary — the compounds that mix it, or — for a compound — the two primaries
-- that make it. The same relation as `teammateColors` in
-- @3xl/shared utils/color/compare.ts; keep the two in step.
create or replace function public.teammate_colors(p_color text)
returns text[] language sql immutable set search_path = public as $$
	select case p_color
		when 'red' then array['red', 'purple', 'orange']
		when 'blue' then array['blue', 'purple', 'green']
		when 'yellow' then array['yellow', 'orange', 'green']
		when 'purple' then array['purple', 'red', 'blue']
		when 'orange' then array['orange', 'red', 'yellow']
		when 'green' then array['green', 'blue', 'yellow']
		else array[p_color]
	end;
$$;

-- Set the caller's team: `p_team` is the three slots in fielded order, as spawn
-- ids with null for an empty one. It replaces whatever they had — there is one
-- team, so saving a line-up is saving THE line-up.
--
-- security definer because `character_spawns` takes no client update at all; this
-- writes exactly one column, on rows the caller owns, and is the only path to it.
-- What it proves is what `start_battle` would otherwise discover far too late: the
-- cards are the caller's, each named once, and every one of them shares a colour
-- with the lead (see `teammate_colors`) — so a team that could never fight is
-- refused where it is built rather than at the door of a fight.
create or replace function public.set_team(p_team jsonb)
returns void language plpgsql security definer set search_path = public as $$
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

	-- The slots, in order. An id is cast only where it looks like a uuid, so junk
	-- in a slot is answered with the rule it broke rather than with a cast error
	-- about the shape of a uuid.
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

	select count(*) into v_owned from public.character_spawns
		where user_id = v_uid and id = any(v_ids);
	if v_owned <> v_given then
		raise exception 'Every fighter must be one of your own claimed cards.';
	end if;

	-- The lead is the first slot, and it is the lead that says what the rest of the
	-- team may be, so a team with no lead is a team with nobody behind it.
	select cs.color into v_lead_color from public.character_spawns cs
		where cs.user_id = v_uid and cs.id = v_ids[1];
	if v_lead_color is null and v_given > 0 then
		raise exception 'A team is led by its first card; fill that slot first.';
	end if;
	if v_lead_color is not null then
		select count(*) into v_mismatched from public.character_spawns cs
			where cs.user_id = v_uid and cs.id = any(v_ids[2:])
				and not (cs.color = any(public.teammate_colors(v_lead_color)));
		if v_mismatched > 0 then
			raise exception 'Every fighter must share a colour with the team lead.';
		end if;
	end if;

	-- Cleared first, so the line-up being saved never collides with the one it
	-- replaces over a slot they both use.
	update public.character_spawns set team_slot = null
		where user_id = v_uid and team_slot is not null;
	update public.character_spawns cs set team_slot = s.slot
		from (
			select (i - 1)::smallint as slot, v_ids[i] as spawn_id
			from generate_subscripts(v_ids, 1) as i
		) s
		where cs.user_id = v_uid and cs.id = s.spawn_id;
end;
$$;

grant execute on function public.set_team(jsonb) to authenticated;
