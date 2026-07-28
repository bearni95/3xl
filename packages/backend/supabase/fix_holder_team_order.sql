-- One-off repair: put every occupying team back in the order it was fielded.
--
-- A town's garrison is the line-up the winning fight reported, and the arena used
-- to report it in the board's drawing order (`rosterFor` sorts each side by where
-- its characters stand on the board) rather than in team order. So every town taken
-- before that was fixed has its members rotated, and the map's panel draws the
-- team's lead — the card that decides its show — somewhere in the middle.
--
-- The board permutation turned out to be a rotation, not the swap this file first
-- assumed, and it is only recoverable against a team whose true order is known. So
-- rather than a blind un-permute, this restates the two affected garrisons (both
-- the same team) in their owner's roster order: red Sanji leads, then orange Sanji,
-- then Fat Buu.
--
-- Rows written after the arena fix are already in team order and are left alone.
-- Not idempotent in spirit — it simply overwrites; check the rows before re-running.

update public.municipality_holders
set team = jsonb_build_array(
		jsonb_build_object('character_id', 'sanji', 'color', 'red', 'stat', 3),
		jsonb_build_object('character_id', 'sanji', 'color', 'orange', 'stat', 6),
		jsonb_build_object('character_id', 'fatbuu', 'color', 'purple', 'stat', 1)
	)
where location_id in ('ES_08121', 'ES_08088');
