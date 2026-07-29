-- The open battle: the one fight a player may have running at a time.
--
-- A fight is not something the browser owns. Picking one on the map opens a row
-- here, each closed turn writes the board back to it, and reporting the result is
-- what finally deletes it. The primary key is the player, so the rule is the table:
-- **one open battle per player, ever**. Closing the arena, reloading, or moving to
-- another device does not lose the fight and does not get out of it — it is still
-- there, on the turn it was left on, and it is the only one that can be played
-- until it is finished.
--
-- That is what the once-a-day challenge limit rests on. Spending the day when the
-- arena opens (municipality_challenges.sql) stops a player refighting a town they
-- have already been to; this stops them walking out of the fight in front of them.
-- Without it the limit only ever cost somebody a town, never the fight they were
-- losing.
--
-- The row is equally the server's own record of WHAT is being fought, and this is
-- what the client no longer gets to say. The town, the turnover of the team sitting
-- on it, and the rival line-up are all fixed here by `start_battle` and never
-- rewritten; `award_combat_exp` reads them from here rather than from the report.
-- A browser can still lie about how its fight went — combat runs client-side and
-- cannot be replayed server-side — but it can no longer choose a different town to
-- have won, nor claim it beat the team currently sitting there when what it
-- actually beat was the one before.
--
-- The `board` is the exception: it IS the browser's, written back as each turn
-- closes so the fight can be picked up where it was left. Nothing is derived from
-- it — it is replayed into the arena and nowhere else — so a tampered board buys
-- exactly what a tampered fight already buys, and no more.
--
-- @3xl/backend provisions all of this automatically alongside the other tables
-- (see ../src/routes/show-templates.ts), so you normally do NOT need to run this
-- file — it's kept for reference and for provisioning by hand.
--
-- Idempotent: safe to re-run.

create table if not exists public.battles (
	-- The player, and the whole of the one-battle rule.
	user_id uuid primary key references auth.users (id) on delete cascade,
	-- The town being fought over, as its geojson feature id (e.g. ES_08028).
	location_id text not null,
	-- The Catalan day whose challenge on that town this battle spent, so the two
	-- ledgers can be read against each other.
	challenge_date date not null default (now() at time zone 'Europe/Madrid')::date,
	-- The town's turnover when the battle opened: the generation of the team being
	-- fought. What makes a fight that outlived a capture recognisable as stale.
	turnover integer not null default 0,
	-- The rival line-up in lane order, as [{character_id, color}] — the team that was
	-- sitting on the town at the time, frozen so a resumed fight faces the same three
	-- whatever has happened to the town since.
	rivals jsonb not null default '[]'::jsonb,
	-- The board as the last closed turn left it, or null while no turn has closed.
	-- {turn, fighters: [{side, slot, spawnId, charges, down, spent, action, cell}]},
	-- where `spent` lists the free orders that fighter's colour has already handed it.
	-- Read only by the arena.
	board jsonb,
	started_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

alter table public.battles enable row level security;

-- A player reads their own open battle and nothing else. There is deliberately no
-- insert/update/delete policy: every write goes through the security-definer RPCs
-- below, because a client that could delete this row could walk out of a losing
-- fight, which is the whole thing being prevented.
drop policy if exists battles_select_own on public.battles;
create policy battles_select_own on public.battles
	for select using (auth.uid() = user_id);

-- Open a battle over a town, called when the arena opens. Replaces the old
-- start_challenge: it does everything that did — spend the town's challenge for the
-- Catalan day, refuse a town the caller already holds — and opens the battle in the
-- same transaction, so the day is never spent on a fight that failed to start.
--
-- Refuses outright when the caller already has a battle open. That is the rule: a
-- fight in progress must be finished (reported) before another can be started, and
-- the frontend takes the player back to it rather than offering them a new one.
--
-- `p_rivals` is the line-up being fought, in lane order, as [{character_id, color}].
-- It is the browser's roll of the town's sitting team — the same one it is about to
-- draw — and it is frozen here so the fight survives the town changing hands.
--
-- (The OUT parameter names deliberately avoid the column names used in the body.)
create or replace function public.start_battle(
	p_location_id text,
	p_turnover int default 0,
	p_rivals jsonb default '[]'::jsonb
)
returns table (town_id text, challenge_day date, opened_at timestamptz)
language plpgsql security definer set search_path = public as $$
declare
	v_uid uuid := auth.uid();
	v_today date := (now() at time zone 'Europe/Madrid')::date;
	v_holder uuid;
	v_started timestamptz;
	v_open text;
begin
	if v_uid is null then
		raise exception 'You must be signed in to challenge a town.';
	end if;
	if p_location_id is null or p_location_id = '' then
		raise exception 'A town is required to start a challenge.';
	end if;

	-- Serialise this player's mutations, matching claim_booster / award_combat_exp.
	perform pg_advisory_xact_lock(hashtextextended(v_uid::text, 0));

	-- One battle at a time. The map never offers a second one — it offers the way
	-- back into this one — so a call that gets here is a client that has lost track
	-- of its own fight, or one trying to leave it behind.
	select b.location_id into v_open from public.battles b where b.user_id = v_uid;
	if v_open is not null then
		raise exception 'You already have a battle in progress. Finish it before starting another.';
	end if;

	select h.user_id into v_holder from public.municipality_holders h
		where h.location_id = p_location_id;
	if v_holder is not null and v_holder = v_uid then
		raise exception 'You already hold this town — you cannot challenge your own team.';
	end if;

	-- Spend the day's challenge on this town, reviving a slot that was handed back
	-- because the town changed hands mid-fight (see municipality_challenges.sql).
	insert into public.municipality_challenges (user_id, location_id, challenge_date)
		values (v_uid, p_location_id, v_today)
		on conflict (user_id, location_id, challenge_date) do update
			set started_at = now(), settled_at = null, voided_at = null
			where municipality_challenges.voided_at is not null
		returning municipality_challenges.started_at into v_started;
	if v_started is null then
		raise exception 'You have already challenged this town today. New challenges at midnight.';
	end if;

	insert into public.battles
		(user_id, location_id, challenge_date, turnover, rivals, board)
		values (v_uid, p_location_id, v_today, greatest(0, coalesce(p_turnover, 0)),
			coalesce(p_rivals, '[]'::jsonb), null);

	town_id := p_location_id;
	challenge_day := v_today;
	opened_at := v_started;
	return next;
end;
$$;

grant execute on function public.start_battle(text, int, jsonb) to authenticated;

-- The pre-battle RPC, dropped rather than left standing: a client that could still
-- claim a day's challenge without opening a battle would have a way to spend the
-- day and then never be held to the fight.
drop function if exists public.start_challenge(text);

-- Write the board back, called as each turn closes. The only mutable part of a
-- battle, and the only thing the browser is the author of. Silently does nothing
-- when the caller has no open battle — a save racing the report that ended the
-- fight is not an error, it is just too late to matter.
create or replace function public.save_battle(p_board jsonb)
returns void
language plpgsql security definer set search_path = public as $$
declare
	v_uid uuid := auth.uid();
begin
	if v_uid is null then
		raise exception 'You must be signed in to play a battle.';
	end if;
	update public.battles
		set board = p_board, updated_at = now()
		where user_id = v_uid;
end;
$$;

grant execute on function public.save_battle(jsonb) to authenticated;
