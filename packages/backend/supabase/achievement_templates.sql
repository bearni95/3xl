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
-- Idempotent: safe to re-run. Requires the core schema (character_spawns,
-- player_profiles, level_for_exp, exp_for_level, level_span_exp) to exist first,
-- which the backend guarantees by provisioning it before running this.

create table if not exists public.achievement_templates (
	id text primary key,
	updated_at timestamptz not null default now()
);

-- The rule, in the three forms the system needs it in: as the author wrote it (so
-- the admin can see the database and the git tree agree, and so a human reading the
-- table can tell what a badge wants), as the tree the evaluator below walks, and as
-- the compiled formulas of the badge's own variables, keyed by name, since a
-- requirement may quote them. All null for a badge with no checkable rule — which is
-- allowed, and simply means the badge is never set as one of a player's three and
-- can never be claimed.
alter table public.achievement_templates add column if not exists requirement text;
alter table public.achievement_templates add column if not exists requirement_tree jsonb;
alter table public.achievement_templates add column if not exists variables jsonb;

alter table public.achievement_templates enable row level security;
drop policy if exists achievement_templates_select_all on public.achievement_templates;
create policy achievement_templates_select_all on public.achievement_templates
	for select using (true);

-- The users-to-achievements join: one row per badge a player holds. Readable by
-- everyone (a badge is worn), and writable by nobody through the anon key — there is
-- deliberately no insert/update/delete policy. `claim_achievements` below is the
-- only writer, and it is security definer.
--
-- Both foreign keys cascade: deleting a player, or retiring a badge from the local
-- collection and syncing, removes the awards along with them.
create table if not exists public.player_achievements (
	user_id uuid not null references auth.users (id) on delete cascade,
	achievement_id text not null
		references public.achievement_templates (id) on delete cascade,
	awarded_at timestamptz not null default now(),
	primary key (user_id, achievement_id)
);

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
create or replace function public.achievement_formula_value(
	p_node jsonb,
	p_level int,
	p_cards jsonb,
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
		v_value := public.achievement_formula_value(p_node -> 'operand', p_level, p_cards, p_vars);
		if p_node ->> 'op' = '-' then
			return -v_value;
		end if;
		return v_value;
	elsif v_kind = 'binary' then
		v_left := public.achievement_formula_value(p_node -> 'left', p_level, p_cards, p_vars);
		v_right := public.achievement_formula_value(p_node -> 'right', p_level, p_cards, p_vars);
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
create or replace function public.achievement_condition_holds(
	p_node jsonb,
	p_level int,
	p_cards jsonb,
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
		return public.achievement_condition_holds(p_node -> 'left', p_level, p_cards, p_vars)
			and public.achievement_condition_holds(p_node -> 'right', p_level, p_cards, p_vars);
	elsif v_kind = 'or' then
		return public.achievement_condition_holds(p_node -> 'left', p_level, p_cards, p_vars)
			or public.achievement_condition_holds(p_node -> 'right', p_level, p_cards, p_vars);
	elsif v_kind = 'not' then
		return not public.achievement_condition_holds(p_node -> 'operand', p_level, p_cards, p_vars);
	elsif v_kind = 'compare' then
		v_left := public.achievement_formula_value(p_node -> 'left', p_level, p_cards, p_vars);
		v_right := public.achievement_formula_value(p_node -> 'right', p_level, p_cards, p_vars);
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

-- Each of a badge's variables evaluated for one player, as a name → number object —
-- what a requirement's `variable` nodes are resolved against. A variable's own
-- formula is evaluated with no variables in scope, which is what makes the set
-- acyclic by construction.
create or replace function public.achievement_variable_values(
	p_variables jsonb,
	p_level int,
	p_cards jsonb
)
returns jsonb language sql immutable as $$
	select coalesce(
		jsonb_object_agg(
			v.key,
			to_jsonb(public.achievement_formula_value(v.value, p_level, p_cards, '{}'::jsonb))
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

-- The ids set for one player on one day: three of them, drawn without replacement
-- from every template the database holds a rule for, sorted by id first so the row
-- order the pool happened to arrive in cannot change the answer. Same 32-bit LCG,
-- same `seed % remaining` index as the browser's.
create or replace function public.daily_achievement_ids(p_user uuid, p_day date)
returns text[] language plpgsql stable set search_path = public as $$
declare
	v_pool text[];
	v_drawn text[] := '{}';
	v_state bigint := public.achievement_daily_seed(p_user, p_day);
	v_index int;
begin
	select coalesce(array_agg(t.id order by t.id), '{}')
		into v_pool
		from public.achievement_templates t
		where t.requirement_tree is not null;

	while coalesce(array_length(v_drawn, 1), 0) < 3 and coalesce(array_length(v_pool, 1), 0) > 0 loop
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
-- finds the row already held.
--
-- The experience is a third of the span of the level the player is on **at
-- completion time** (achievementExpAward in @3xl/shared mirrors it). The level is
-- re-read for each badge in the same claim, so a badge that levels a player up makes
-- the next one in the same call worth more — and, for the same reason, the level the
-- requirements are evaluated against is the running one too.
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
	total_exp bigint
)
language plpgsql security definer set search_path = public as $$
declare
	v_uid uuid := auth.uid();
	v_day date := (now() at time zone 'Europe/Madrid')::date;
	v_ids text[];
	v_id text;
	v_cards jsonb;
	v_exp bigint;
	v_level int;
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
	select coalesce(p.exp, 0) into v_exp from public.player_profiles p where p.user_id = v_uid;
	v_exp := coalesce(v_exp, 0);

	foreach v_id in array v_ids loop
		select t.requirement_tree, t.variables
			into v_tree, v_variables
			from public.achievement_templates t
			where t.id = v_id;

		v_held := exists (
			select 1 from public.player_achievements pa
			where pa.user_id = v_uid and pa.achievement_id = v_id
		);
		v_level := public.level_for_exp(v_exp);
		v_vars := public.achievement_variable_values(v_variables, v_level, v_cards);
		v_met := v_tree is not null
			and public.achievement_condition_holds(v_tree, v_level, v_cards, v_vars);
		v_award := 0;

		if v_met and not v_held then
			v_award := floor(public.level_span_exp(v_level) / 3.0)::bigint;
			-- The conflict target is named by its constraint rather than its columns:
			-- `achievement_id` is also one of this function's output parameters, and a
			-- column list in a conflict target would not know which of the two was meant.
			-- Belt and braces anyway — the advisory lock plus v_held already settle it.
			insert into public.player_achievements (user_id, achievement_id, exp_awarded)
				values (v_uid, v_id, v_award)
				on conflict on constraint player_achievements_pkey do nothing;
			if v_award > 0 then
				insert into public.player_profiles (user_id, exp)
					values (v_uid, v_award)
					on conflict (user_id) do update
						set exp = player_profiles.exp + v_award, updated_at = now()
					returning player_profiles.exp into v_exp;
			end if;
		end if;

		achievement_id := v_id;
		granted := v_met and not v_held;
		held := v_held;
		met := v_met;
		exp_awarded := v_award;
		at_level := v_level;
		total_exp := v_exp;
		return next;
	end loop;
end;
$$;

grant execute on function public.claim_achievements() to authenticated;
