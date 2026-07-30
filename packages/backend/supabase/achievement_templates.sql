-- Achievements in Supabase: which badges exist, what earns each of them, who
-- holds them, and the one entry point that awards one.
--
-- Supabase holds no wording. A badge's glyph, name and description live in the
-- local @3xl/data public/achievements.json, authored on the admin /achievements
-- screen, so rewording a badge is one edit in the git tree that no row anywhere can
-- disagree with. What Supabase *does* hold is the badge's **rule**: awarding is a
-- rule, rules are enforced where they cannot be edited by a browser, and a rule the
-- database cannot read is a rule the database cannot enforce. So each template
-- carries the requirement as authored (`requirement`) and as a compiled syntax tree
-- (`requirement_tree`), plus its variables' compiled formulas (`variables`) — all
-- three written by `POST /api/achievement-templates/sync`, never by hand.
--
-- Unlike every other file in this folder, this one is NOT reference-only: the
-- backend reads it off disk and executes it (see ../src/routes/achievement-templates.ts).
-- The evaluator below is the second implementation of the formula language — the
-- first is @3xl/shared's utils/achievement/formula.ts, which the browser uses to
-- decide what to grey out — and two copies of an awarding rule that drift apart pay
-- out badges nobody earned. Keeping the one the server runs in a file, rather than
-- inlined in a TypeScript string beside the other DDL, is what makes the two
-- readable side by side.
--
-- How many badges a day is a setting, not a constant: `achievement_settings` holds it
-- and `daily_achievement_count()` reads it, so the same number reaches the draw here
-- and the browser that has to show the same pick.
--
-- The *level* a day's badges are set against is pinned the same way, and for the same
-- reason both sides have to agree on it: `achievement_day_levels` holds one row per
-- player per day and `daily_achievement_level()` writes it on the day's first look, so
-- a target written on `level` cannot be raised by the levelling-up the day's own badges
-- pay for.
--
-- Idempotent: safe to re-run. Requires the core schema (character_spawns,
-- municipality_holders, booster_grants, player_profiles, level_for_exp, exp_for_level,
-- level_span_exp) to exist first, which the backend guarantees by provisioning it
-- before running this — a `language sql` body is parsed as it is created, so a
-- function reading a table that is not there yet fails outright rather than later.

create table if not exists public.achievement_templates (
	id text primary key,
	updated_at timestamptz not null default now()
);

-- The rule, in the three forms the system needs it in: as the author wrote it (so
-- the admin can see the database and the git tree agree, and so a human reading the
-- table can tell what a badge wants), as the tree the evaluator below walks, and as
-- the compiled formulas of the badge's own variables, keyed by name, since a
-- requirement may quote them. All null for a badge with no checkable rule — which is
-- allowed: such a badge is still set as one of a player's day, since the pick is over
-- every badge the game has, and simply cannot be completed until somebody writes it a
-- rule.
alter table public.achievement_templates add column if not exists requirement text;
alter table public.achievement_templates add column if not exists requirement_tree jsonb;
alter table public.achievement_templates add column if not exists variables jsonb;

alter table public.achievement_templates enable row level security;
drop policy if exists achievement_templates_select_all on public.achievement_templates;
create policy achievement_templates_select_all on public.achievement_templates
	for select using (true);

-- ---------------------------------------------------------------------------
-- How many badges a day
-- ---------------------------------------------------------------------------
-- One row, holding the one number that is a *setting* rather than a rule: how many
-- badges a player is set each day. It lives here rather than in the code because
-- both sides of the draw have to agree on it — the browser, which shows the day's
-- badges, and `claim_achievements`, which will only pay for one of them — and a
-- number written into two languages is a number that can be changed in one of them.
--
-- World-readable, since the browser has to draw the same set it will be allowed to
-- claim, and writable by nobody through the anon key: raising the count raises what
-- the game pays out, so it is changed with the database password (the admin's
-- achievements screen does it through @3xl/backend) and never from a page.
create table if not exists public.achievement_settings (
	-- One row, and the check is what keeps it that way.
	singleton boolean primary key default true check (singleton),
	daily_count integer not null default 3 check (daily_count between 1 and 20),
	updated_at timestamptz not null default now()
);
insert into public.achievement_settings (singleton) values (true) on conflict do nothing;

alter table public.achievement_settings enable row level security;
drop policy if exists achievement_settings_select_all on public.achievement_settings;
create policy achievement_settings_select_all on public.achievement_settings
	for select using (true);

-- The setting, or the number the game ships with when there is no row to read. Every
-- reader goes through this so "no row" and "a row" cannot disagree.
create or replace function public.daily_achievement_count()
returns int language sql stable set search_path = public as $$
	select coalesce((select s.daily_count from public.achievement_settings s limit 1), 3);
$$;

-- The users-to-achievements join: one row per badge a player has completed **on one
-- day**. Readable by everyone (a badge is worn), and writable by nobody through the
-- anon key — there is deliberately no insert/update/delete policy.
-- `claim_achievements` below is the only writer, and it is security definer.
--
-- The day is part of what a completion *is*, not a timestamp attached to one. A badge
-- is set for a day and earned for that day: the same badge drawn again next week is a
-- new thing to do, claimable again and paying again, and one earned today says nothing
-- about a day it has not been set for yet. Keyed on the badge alone, the game read a
-- badge completed this morning as already held every future day it came up — a day's
-- work that could be done before the day, which is no work at all.
--
-- Both foreign keys cascade: deleting a player, or retiring a badge from the local
-- collection and syncing, removes the awards along with them.
create table if not exists public.player_achievements (
	user_id uuid not null references auth.users (id) on delete cascade,
	achievement_id text not null
		references public.achievement_templates (id) on delete cascade,
	-- The Catalan day it was set and earned for, as `daily_achievement_ids` counts days.
	day date not null default ((now() at time zone 'Europe/Madrid')::date),
	awarded_at timestamptz not null default now(),
	primary key (user_id, achievement_id, day)
);

-- Migration for a table from when a badge was a once-ever thing: the day it was earned
-- for is the Catalan day its timestamp fell in, which is exactly what the old rows
-- meant. Then the key becomes the three columns, so the same badge can be earned again
-- on a later day. Guarded on the key's width so re-running finds nothing to do.
alter table public.player_achievements add column if not exists day date;
update public.player_achievements
	set day = (awarded_at at time zone 'Europe/Madrid')::date
	where day is null;
alter table public.player_achievements
	alter column day set default ((now() at time zone 'Europe/Madrid')::date);
alter table public.player_achievements alter column day set not null;

do $migrate_key$
begin
	if not exists (
		select 1 from pg_constraint
		where conrelid = 'public.player_achievements'::regclass
			and contype = 'p'
			and array_length(conkey, 1) = 3
	) then
		alter table public.player_achievements drop constraint if exists player_achievements_pkey;
		alter table public.player_achievements
			add constraint player_achievements_pkey primary key (user_id, achievement_id, day);
	end if;
end;
$migrate_key$;

-- What the badge paid when it was awarded. Kept on the row rather than recomputed,
-- because it is a third of the level the player was on *at that moment* and that
-- level is gone the instant the award lands — it is the audit trail for the
-- experience, as combat_results is for a fight's.
alter table public.player_achievements
	add column if not exists exp_awarded bigint not null default 0;

create index if not exists player_achievements_achievement_idx
	on public.player_achievements (achievement_id);

alter table public.player_achievements enable row level security;
drop policy if exists player_achievements_select_all on public.player_achievements;
create policy player_achievements_select_all on public.player_achievements
	for select using (true);

-- ---------------------------------------------------------------------------
-- The level a day's badges are set against
-- ---------------------------------------------------------------------------
-- A badge's target is usually written on the player's level — `level * 3` towns,
-- `level * 5` cards — so reading `level` live meant a day's badges got harder while
-- the player was working on them: level up at noon and the three you were three cards
-- away from want five more. The target has to hold still for the day, so the level it
-- is worked out from is pinned to a row: one per player per Catalan day, written the
-- first time that day is looked at and never again.
--
-- What it pins is the level as it stood when the day was first *seen*, which is the
-- earliest moment there is anything to pin — nothing runs at midnight Europe/Madrid,
-- and a player who does not open the game until the evening has no earlier level for
-- the database to have known about. From that moment on the day is settled.
--
-- Only the target is pinned. What the player *has* — their cards, their towns — is
-- read live, or a badge could never be progressed on the day it was set. And what a
-- badge *pays* is read live too (a third of the span of the level they are on when it
-- lands), because that is the value of the level they are actually on.
--
-- A player reads only their own rows, and writes none: `daily_achievement_level()`
-- below is the only writer and it is security definer, so the level a day is set
-- against can never be chosen from a browser.
create table if not exists public.achievement_day_levels (
	user_id uuid not null references auth.users (id) on delete cascade,
	-- The Catalan day, as `daily_achievement_ids` counts days.
	day date not null,
	level integer not null,
	created_at timestamptz not null default now(),
	primary key (user_id, day)
);

alter table public.achievement_day_levels enable row level security;
drop policy if exists achievement_day_levels_select_own on public.achievement_day_levels;
create policy achievement_day_levels_select_own on public.achievement_day_levels
	for select using (auth.uid() = user_id);

-- The level the caller's badges are set against today: the pinned one, or their
-- current level pinned right now if this is the day's first look. Takes no arguments
-- for the same reason `claim_achievements` does not — whose level, and which day, are
-- not a browser's to name.
--
-- Both the browser (which draws the targets) and the claim below go through this, so
-- there is one answer rather than two that could disagree.
create or replace function public.daily_achievement_level()
returns int language plpgsql security definer set search_path = public as $$
declare
	v_uid uuid := auth.uid();
	v_day date := (now() at time zone 'Europe/Madrid')::date;
	v_level int;
begin
	if v_uid is null then
		raise exception 'You must be signed in to read the day''s level.';
	end if;

	insert into public.achievement_day_levels (user_id, day, level)
		select v_uid, v_day, public.level_for_exp(coalesce(p.exp, 0))
			from public.player_profiles p
			where p.user_id = v_uid
		on conflict (user_id, day) do nothing;

	select l.level into v_level
		from public.achievement_day_levels l
		where l.user_id = v_uid and l.day = v_day;

	-- No row and nothing inserted means no profile row yet, which is a player who has
	-- earned nothing: the first level, which is what `level_for_exp(0)` answers.
	return coalesce(v_level, public.level_for_exp(0));
end;
$$;

grant execute on function public.daily_achievement_level() to authenticated;

-- ---------------------------------------------------------------------------
-- The formula language, evaluated in the database
-- ---------------------------------------------------------------------------
-- Mirrors @3xl/shared's utils/achievement/formula.ts node for node. The tree is the
-- wire format between the two: `{"kind":"binary","op":"*","left":…,"right":…}`,
-- with `cards` carrying a filter tree and `variable` carrying a name.
--
-- Everything is done in double precision, which is the same IEEE-754 arithmetic a
-- browser's numbers are, so the two evaluators agree to the bit. Where JavaScript
-- would produce a non-finite number Postgres raises instead, so the arithmetic below
-- is guarded and answers 0 — the same thing the TypeScript side answers.

-- Whether one card satisfies a filter tree. The card arrives already reduced to the
-- fields the language names (see achievement_player_cards), so there is no table of
-- field mappings here: a filter's `field` is a key of that object.
create or replace function public.achievement_filter_matches(p_filter jsonb, p_card jsonb)
returns boolean language plpgsql immutable as $$
declare
	v_kind text := p_filter ->> 'kind';
	v_actual text;
	v_hit boolean;
begin
	if v_kind = 'and' then
		return public.achievement_filter_matches(p_filter -> 'left', p_card)
			and public.achievement_filter_matches(p_filter -> 'right', p_card);
	elsif v_kind = 'or' then
		return public.achievement_filter_matches(p_filter -> 'left', p_card)
			or public.achievement_filter_matches(p_filter -> 'right', p_card);
	elsif v_kind = 'not' then
		return not public.achievement_filter_matches(p_filter -> 'operand', p_card);
	elsif v_kind = 'match' then
		v_actual := p_card ->> (p_filter ->> 'field');
		-- A card with no value for the field (a pack rolled across all shows has no
		-- show) is not any of the listed values, and so *is* `!=` every one.
		v_hit := v_actual is not null and exists (
			select 1 from jsonb_array_elements_text(p_filter -> 'values') as v(value)
			where lower(v.value) = lower(v_actual)
		);
		if coalesce((p_filter ->> 'negated')::boolean, false) then
			return not v_hit;
		end if;
		return v_hit;
	end if;
	raise exception 'Unknown card filter node "%".', coalesce(v_kind, 'null');
end;
$$;

-- The number a formula tree produces. `p_vars` is the badge's variable values by
-- name (see achievement_variable_values) — empty for a variable's own formula, which
-- cannot quote another variable.
--
-- The context arguments are the whole of what the language can read, and they arrive
-- already reduced to numbers and to that array of cards: `p_towns` is how many towns
-- the player holds (see achievement_player_towns), which is a count here for the same
-- reason it is one in the browser — there is nothing about a held town a filter could
-- test that both sides would agree on.
--
-- Dropped rather than replaced: this gained an argument, and `create or replace`
-- would leave the previous signature behind as a second overload that still reads a
-- `towns` node as unknown and raises.
drop function if exists public.achievement_formula_value(jsonb, int, jsonb, jsonb);
create or replace function public.achievement_formula_value(
	p_node jsonb,
	p_level int,
	p_cards jsonb,
	p_towns int,
	p_vars jsonb
)
returns double precision language plpgsql immutable as $$
declare
	v_kind text := p_node ->> 'kind';
	v_op text;
	v_left double precision;
	v_right double precision;
	v_value double precision;
	v_count bigint;
begin
	if v_kind = 'number' then
		return (p_node ->> 'value')::double precision;
	elsif v_kind = 'level' then
		return p_level::double precision;
	elsif v_kind = 'towns' then
		return coalesce(p_towns, 0)::double precision;
	elsif v_kind = 'variable' then
		-- A name nothing has a value for reads as 0 rather than failing, exactly as it
		-- does in the browser: it means a requirement outlived the variable it quoted.
		return coalesce((p_vars ->> (p_node ->> 'name'))::double precision, 0);
	elsif v_kind = 'cards' then
		if p_node -> 'filter' is null or jsonb_typeof(p_node -> 'filter') = 'null' then
			return coalesce(jsonb_array_length(p_cards), 0)::double precision;
		end if;
		select count(*) into v_count
			from jsonb_array_elements(p_cards) as c(value)
			where public.achievement_filter_matches(p_node -> 'filter', c.value);
		return v_count::double precision;
	elsif v_kind = 'unary' then
		v_value := public.achievement_formula_value(p_node -> 'operand', p_level, p_cards, p_towns, p_vars);
		if p_node ->> 'op' = '-' then
			return -v_value;
		end if;
		return v_value;
	elsif v_kind = 'binary' then
		v_left := public.achievement_formula_value(p_node -> 'left', p_level, p_cards, p_towns, p_vars);
		v_right := public.achievement_formula_value(p_node -> 'right', p_level, p_cards, p_towns, p_vars);
		v_op := p_node ->> 'op';
		-- Guarded as one block: an overflow, or a power Postgres refuses outright,
		-- answers 0 — which is what a browser's non-finite result answers.
		begin
			if v_op = '+' then
				v_value := v_left + v_right;
			elsif v_op = '-' then
				v_value := v_left - v_right;
			elsif v_op = '*' then
				v_value := v_left * v_right;
			elsif v_op = '/' then
				v_value := case when v_right = 0 then 0 else v_left / v_right end;
			elsif v_op = '%' then
				-- JavaScript's remainder: the sign follows the dividend and the quotient
				-- is truncated toward zero, which `mod` on an integer type would not do
				-- and which float8 has no operator for.
				v_value := case
					when v_right = 0 then 0
					else v_left - v_right * trunc(v_left / v_right)
				end;
			elsif v_op = '^' then
				v_value := case when abs(v_right) > 1000 then 0 else power(v_left, v_right) end;
			else
				raise exception 'Unknown arithmetic operator "%".', coalesce(v_op, 'null');
			end if;
		exception
			when numeric_value_out_of_range or division_by_zero or invalid_argument_for_power_function then
				return 0;
		end;
		if v_value is null or v_value = 'Infinity'::double precision
			or v_value = '-Infinity'::double precision or v_value = 'NaN'::double precision then
			return 0;
		end if;
		return v_value;
	end if;
	raise exception 'Unknown formula node "%".', coalesce(v_kind, 'null');
end;
$$;

-- Whether a requirement tree holds: comparisons of two amounts, combined with
-- and/or/not. `=` is an exact comparison of two doubles, as it is in the browser.
-- Dropped rather than replaced for the same reason as the evaluator above: the extra
-- context argument would otherwise leave the old signature standing.
drop function if exists public.achievement_condition_holds(jsonb, int, jsonb, jsonb);
create or replace function public.achievement_condition_holds(
	p_node jsonb,
	p_level int,
	p_cards jsonb,
	p_towns int,
	p_vars jsonb
)
returns boolean language plpgsql immutable as $$
declare
	v_kind text := p_node ->> 'kind';
	v_op text;
	v_left double precision;
	v_right double precision;
begin
	if v_kind = 'and' then
		return public.achievement_condition_holds(p_node -> 'left', p_level, p_cards, p_towns, p_vars)
			and public.achievement_condition_holds(p_node -> 'right', p_level, p_cards, p_towns, p_vars);
	elsif v_kind = 'or' then
		return public.achievement_condition_holds(p_node -> 'left', p_level, p_cards, p_towns, p_vars)
			or public.achievement_condition_holds(p_node -> 'right', p_level, p_cards, p_towns, p_vars);
	elsif v_kind = 'not' then
		return not public.achievement_condition_holds(p_node -> 'operand', p_level, p_cards, p_towns, p_vars);
	elsif v_kind = 'compare' then
		v_left := public.achievement_formula_value(p_node -> 'left', p_level, p_cards, p_towns, p_vars);
		v_right := public.achievement_formula_value(p_node -> 'right', p_level, p_cards, p_towns, p_vars);
		v_op := p_node ->> 'op';
		if v_op = '>=' then return v_left >= v_right;
		elsif v_op = '<=' then return v_left <= v_right;
		elsif v_op = '>' then return v_left > v_right;
		elsif v_op = '<' then return v_left < v_right;
		elsif v_op = '=' then return v_left = v_right;
		elsif v_op = '!=' then return v_left <> v_right;
		end if;
		raise exception 'Unknown comparison "%".', coalesce(v_op, 'null');
	end if;
	raise exception 'Unknown requirement node "%".', coalesce(v_kind, 'null');
end;
$$;

-- One player's cards, reduced to exactly the fields a filter can test and keyed by
-- the names the language uses for them. This is the one place the mapping from a
-- `character_spawns` row to the language's idea of a card lives on this side — the
-- CARD_FIELDS table in formula.ts is the other.
--
-- Not security definer, and not callable by a client: the definer functions below
-- call it and so run it past RLS themselves, which is the only way it is meant to
-- be reached — a client able to call it could read anybody's cards by passing their
-- id.
create or replace function public.achievement_player_cards(p_user uuid)
returns jsonb language sql stable set search_path = public as $$
	select coalesce(jsonb_agg(jsonb_build_object(
		'color', s.color,
		'box', s.box,
		'character', s.character_id,
		'show', s.show_id::text,
		'location', s.location_id,
		'team', case when s.team_slot is null then 'false' else 'true' end
	)), '[]'::jsonb)
	from public.character_spawns s
	where s.user_id = p_user;
$$;
revoke all on function public.achievement_player_cards(uuid) from public;

-- How many municipalities one player occupies: one per `municipality_holders` row of
-- theirs, which is the same thing the map draws in their colour. The towns they have
-- merely besieged do not count — a siege is progress towards a town, not a town — and
-- neither does the seeded OG team a town wears until somebody takes it.
--
-- A count, not the towns themselves, because that is the whole of what the language
-- can read (see the `towns` source in formula.ts): the browser reaches the same number
-- off the same table.
--
-- Not security definer, and not callable by a client, exactly as the cards above: it
-- is reached only from the definer function below, and a client able to call it could
-- ask about anybody.
create or replace function public.achievement_player_towns(p_user uuid)
returns int language sql stable set search_path = public as $$
	select count(*)::int from public.municipality_holders h where h.user_id = p_user;
$$;
revoke all on function public.achievement_player_towns(uuid) from public;

-- Each of a badge's variables evaluated for one player, as a name → number object —
-- what a requirement's `variable` nodes are resolved against. A variable's own
-- formula is evaluated with no variables in scope, which is what makes the set
-- acyclic by construction.
drop function if exists public.achievement_variable_values(jsonb, int, jsonb);
create or replace function public.achievement_variable_values(
	p_variables jsonb,
	p_level int,
	p_cards jsonb,
	p_towns int
)
returns jsonb language sql immutable as $$
	select coalesce(
		jsonb_object_agg(
			v.key,
			to_jsonb(public.achievement_formula_value(v.value, p_level, p_cards, p_towns, '{}'::jsonb))
		),
		'{}'::jsonb
	)
	from jsonb_each(coalesce(p_variables, '{}'::jsonb)) as v;
$$;

-- ---------------------------------------------------------------------------
-- The three badges of the day
-- ---------------------------------------------------------------------------
-- Mirrors @3xl/shared's utils/achievement/daily.ts step for step, and the pinned
-- numbers in packages/frontend/test/utils/achievement-daily.test.ts are the contract
-- between the two. Nothing is stored: a player's three are a pure function of who
-- they are and which Catalan day it is, so there is no table of assignments to seed
-- or to disagree about, and everybody's three change at midnight Europe/Madrid —
-- the same boundary the booster allowance and the daily challenge turn on.

-- FNV-1a (32 bit) over '<user id>:<day>'. Every character of a uuid and an ISO date
-- is ASCII, so `ascii()` per character is the same as per byte.
create or replace function public.achievement_daily_seed(p_user uuid, p_day date)
returns bigint language plpgsql immutable as $$
declare
	v_text text := p_user::text || ':' || to_char(p_day, 'YYYY-MM-DD');
	v_hash bigint := 2166136261;
	i int;
begin
	for i in 1..length(v_text) loop
		v_hash := ((v_hash # ascii(substr(v_text, i, 1)))::bigint * 16777619) % 4294967296;
	end loop;
	return v_hash;
end;
$$;

-- The ids set for one player on one day: `daily_achievement_count()` of them, drawn
-- without replacement from **every** template, sorted by id first so the row order the
-- pool happened to arrive in cannot change the answer. Same 32-bit LCG, same
-- `seed % remaining` index as the browser's.
--
-- Every template, not only the ones with a rule. Drawing from the rules alone meant a
-- game whose badges had none was set nothing at all — the player opened the panel to an
-- empty day, which is a state about the authoring rather than about them. A badge with
-- no rule is simply one nothing can complete: it is set, it is shown, and the claim
-- below finds no tree to walk and grants it nothing. Both sides read the same pool for
-- the same reason as ever, so this widening happens here and in
-- @3xl/shared's daily.ts together.
create or replace function public.daily_achievement_ids(p_user uuid, p_day date)
returns text[] language plpgsql stable set search_path = public as $$
declare
	v_pool text[];
	v_drawn text[] := '{}';
	v_state bigint := public.achievement_daily_seed(p_user, p_day);
	v_count int := public.daily_achievement_count();
	v_index int;
begin
	select coalesce(array_agg(t.id order by t.id), '{}')
		into v_pool
		from public.achievement_templates t;

	while coalesce(array_length(v_drawn, 1), 0) < v_count and coalesce(array_length(v_pool, 1), 0) > 0 loop
		v_state := (1664525 * v_state + 1013904223) % 4294967296;
		v_index := (v_state % array_length(v_pool, 1)) + 1;
		v_drawn := v_drawn || v_pool[v_index];
		v_pool := v_pool[1:v_index - 1] || v_pool[v_index + 1:array_length(v_pool, 1)];
	end loop;
	return v_drawn;
end;
$$;
revoke all on function public.daily_achievement_ids(uuid, date) from public;

-- ---------------------------------------------------------------------------
-- Claiming
-- ---------------------------------------------------------------------------
-- The player says "I have done today's badges"; this decides whether they have.
--
-- It takes no arguments on purpose. Which badges are claimable is not the browser's
-- to say (they are today's three, recomputed here), whether one has been earned is
-- not the browser's to say (the requirement tree is walked here, against rows the
-- caller cannot write), and how much experience one pays is not the browser's to say
-- (a third of the level's span, read here). The client submits an intention and
-- nothing else — the same trust model as claim_booster and award_combat_exp.
--
-- Every one of today's three is reported, whether or not it was granted, so the
-- screen can say which were paid out, which were already held, and which are not
-- there yet. Idempotent: claiming twice in a day pays once, since the second call
-- finds the row already held *for today*.
--
-- Held is a question about a day, not about a badge. A badge earned on an earlier day
-- is claimable again when it is drawn again, and pays again; nothing about a future
-- day can be claimed at all, since the only ids this settles are the ones it works out
-- for the date it reads off the clock.
--
-- A completion pays twice over: experience, and the day's booster allowance. Each
-- badge granted is worth one extra pack today, and finishing the whole of the day's
-- set — every one of them completed today — is worth two more. Both go into
-- `booster_grants`, the ledger the booster cap is already the sum of, so they lapse at
-- Catalan midnight along with every other grant.
--
-- The experience is a third of the span of the level the player is on **at
-- completion time** (achievementExpAward in @3xl/shared mirrors it). The level is
-- re-read for each badge in the same claim, so a badge that levels a player up makes
-- the next one in the same call worth more.
--
-- The level the *rules* are read at is a different level, and deliberately so: it is
-- the day's pinned one (`daily_achievement_level`), so a target written on `level`
-- says the same thing all day and cannot be moved by the levelling-up that happens
-- while the badges are being worked on — including the levelling-up this very call
-- does. What the player has is still read live; only the bar is pinned.
-- Dropped first: this gained output columns, and Postgres will not replace a
-- function's return type in place (the same reason claim_booster is dropped).
drop function if exists public.claim_achievements();
create or replace function public.claim_achievements()
returns table (
	achievement_id text,
	-- Awarded by this call: met, and not already held.
	granted boolean,
	-- Already held before this call — nothing to pay twice.
	held boolean,
	-- Whether the requirement holds right now, granted or not.
	met boolean,
	exp_awarded bigint,
	at_level int,
	total_exp bigint,
	-- Extra booster packs this call added to today's allowance: one per badge it
	-- granted, plus the set bonus. The same on every row — it is what the call did.
	boosters_granted int,
	-- Whether this call finished the whole of the day's set, all of it earned today,
	-- which is what the bonus above is paid for.
	set_completed boolean
)
language plpgsql security definer set search_path = public as $$
declare
	v_uid uuid := auth.uid();
	-- The day being settled, and the day every row this writes belongs to. Only today's
	-- set is ever claimable: the ids are recomputed here from this date, so a browser
	-- looking at another day has nothing it can submit about it.
	v_day date := (now() at time zone 'Europe/Madrid')::date;
	-- What a completion is worth in booster packs. The game's numbers, and they live
	-- only here: the browser is told what it was granted and never names an amount.
	v_per_badge constant int := 1;
	v_set_bonus constant int := 2;
	v_granted_count int := 0;
	v_boosters int := 0;
	v_set_completed boolean := false;
	-- Each badge's answer, held until the whole call is settled (see the loop).
	v_results jsonb := '[]'::jsonb;
	v_result jsonb;
	v_ids text[];
	v_id text;
	v_cards jsonb;
	v_towns int;
	v_exp bigint;
	-- The level the player is on right now, re-read per badge: what an award is worth.
	v_level int;
	-- The level this day's badges are set against: what a rule is read at.
	v_rule_level int;
	v_tree jsonb;
	v_variables jsonb;
	v_vars jsonb;
	v_met boolean;
	v_held boolean;
	v_award bigint;
begin
	if v_uid is null then
		raise exception 'You must be signed in to claim an achievement.';
	end if;

	-- Serialise this player's mutations, matching claim_booster / award_combat_exp:
	-- two claims racing would both read "not held" and both pay.
	perform pg_advisory_xact_lock(hashtextextended(v_uid::text, 0));

	v_ids := public.daily_achievement_ids(v_uid, v_day);
	v_cards := public.achievement_player_cards(v_uid);
	-- Read once for the whole claim, as the cards are: nothing this function does takes
	-- a town or loses one, so every badge in the call is judged against the same map.
	v_towns := public.achievement_player_towns(v_uid);
	-- The day's pinned level, pinning it if this claim is the day's first look at all.
	-- Read before anything is awarded, so the experience this call pays cannot raise the
	-- bar the same call is judging against.
	v_rule_level := public.daily_achievement_level();
	select coalesce(p.exp, 0) into v_exp from public.player_profiles p where p.user_id = v_uid;
	v_exp := coalesce(v_exp, 0);

	foreach v_id in array v_ids loop
		select t.requirement_tree, t.variables
			into v_tree, v_variables
			from public.achievement_templates t
			where t.id = v_id;

		-- Held *for today*. A badge earned on an earlier day is not this day's work: it
		-- comes up again as something to do again, worth its experience and its pack
		-- again, which is what makes a day's set a day's set.
		v_held := exists (
			select 1 from public.player_achievements pa
			where pa.user_id = v_uid and pa.achievement_id = v_id and pa.day = v_day
		);
		v_level := public.level_for_exp(v_exp);
		v_vars := public.achievement_variable_values(v_variables, v_rule_level, v_cards, v_towns);
		v_met := v_tree is not null
			and public.achievement_condition_holds(v_tree, v_rule_level, v_cards, v_towns, v_vars);
		v_award := 0;

		if v_met and not v_held then
			v_award := floor(public.level_span_exp(v_level) / 3.0)::bigint;
			-- The conflict target is named by its constraint rather than its columns:
			-- `achievement_id` is also one of this function's output parameters, and a
			-- column list in a conflict target would not know which of the two was meant.
			-- Belt and braces anyway — the advisory lock plus v_held already settle it.
			insert into public.player_achievements (user_id, achievement_id, day, exp_awarded)
				values (v_uid, v_id, v_day, v_award)
				on conflict on constraint player_achievements_pkey do nothing;
			if v_award > 0 then
				insert into public.player_profiles (user_id, exp)
					values (v_uid, v_award)
					on conflict (user_id) do update
						set exp = player_profiles.exp + v_award, updated_at = now()
					returning player_profiles.exp into v_exp;
			end if;
		end if;

		if v_met and not v_held then
			v_granted_count := v_granted_count + 1;
		end if;

		-- Held back rather than returned here: what this call did to the day's booster
		-- allowance is a fact about the call, not about one badge, and it is not known
		-- until every badge has been settled. The rows are emitted after that.
		v_results := v_results || jsonb_build_object(
			'achievement_id', v_id,
			'granted', v_met and not v_held,
			'held', v_held,
			'met', v_met,
			'exp_awarded', v_award,
			'at_level', v_level,
			'total_exp', v_exp
		);
	end loop;

	-- The day's booster allowance, raised by what was just completed. A badge is worth
	-- one extra pack today, and finishing the whole of the day's set is worth two more
	-- on top — earned only when every one of them was completed *today*, since a badge
	-- carried over from an earlier day was not worked for on this one.
	--
	-- Written to `booster_grants`, which is the ledger `claim_booster` and
	-- `boosters_status` already add to the level to get the cap (see booster_claims.sql,
	-- and `recycle_spawns`, which pays into the same place). So nothing else has to be
	-- taught about achievements: the allowance goes up, and it lapses at Catalan midnight
	-- like every other grant, which is what "for the day" means.
	--
	-- Gated on this call having granted something, which is what keeps it paid once: a
	-- second claim the same day grants no badge, so it adds no packs and cannot re-earn
	-- the set bonus.
	if v_granted_count > 0 then
		-- Every one of today's, earned for today. The day is on the row, so this asks the
		-- question directly rather than reading it off a timestamp.
		v_set_completed := coalesce(array_length(v_ids, 1), 0) > 0 and (
			select count(distinct pa.achievement_id)
				from public.player_achievements pa
				where pa.user_id = v_uid
					and pa.achievement_id = any(v_ids)
					and pa.day = v_day
		) = array_length(v_ids, 1);
		v_boosters := v_granted_count * v_per_badge
			+ case when v_set_completed then v_set_bonus else 0 end;
		insert into public.booster_grants (user_id, grant_date, amount)
			values (v_uid, v_day, v_boosters);
	end if;

	for v_result in select value from jsonb_array_elements(v_results) loop
		achievement_id := v_result ->> 'achievement_id';
		granted := (v_result ->> 'granted')::boolean;
		held := (v_result ->> 'held')::boolean;
		met := (v_result ->> 'met')::boolean;
		exp_awarded := (v_result ->> 'exp_awarded')::bigint;
		at_level := (v_result ->> 'at_level')::int;
		total_exp := (v_result ->> 'total_exp')::bigint;
		-- The same two numbers on every row, as the experience total already is: they are
		-- what the call did, not what this badge did.
		boosters_granted := v_boosters;
		set_completed := v_set_completed;
		return next;
	end loop;
end;
$$;

grant execute on function public.claim_achievements() to authenticated;
