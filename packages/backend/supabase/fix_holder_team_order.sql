-- One-off repair: put every occupying team's lead back in front.
--
-- A town's garrison is the line-up the winning fight reported, and the arena used
-- to report it in the board's drawing order rather than the order the team was
-- fielded: `rosterFor` sorts each side by where its characters stand on the board
-- (top→bottom), which for the player's side is [slot 1, slot 0, slot 2]. So every
-- town taken before that was fixed has its lead — the first team slot, the card
-- that decides the team's show — frozen in the MIDDLE of its team, and the map's
-- panel draws it second.
--
-- The permutation is fixed and invertible: swapping the first two members restores
-- the fielded order. Rows written after the arena fix are already correct, so run
-- this ONCE, against a database whose holder rows all predate it.
--
-- Not idempotent: running it twice swaps the lead back out again.

update public.municipality_holders
set team = jsonb_build_array(team -> 1, team -> 0) || coalesce(
		(
			select jsonb_agg(entry.value order by entry.ord)
			from jsonb_array_elements(team) with ordinality as entry(value, ord)
			where entry.ord > 2
		),
		'[]'::jsonb
	)
where jsonb_typeof(team) = 'array' and jsonb_array_length(team) >= 2;
