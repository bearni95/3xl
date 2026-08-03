/**
 * The author's frame deletions, kept where a re-decode cannot reach them.
 *
 * A character's frames are described in the decoded manifest (@3xl/assets
 * public/<id>/frames/manifest.json), and that file is generated: every
 * `pnpm import:mugen` — additive mode included — and every `pnpm generate:sprites`
 * rewrites it whole from the raw .sff/.air. So a frame the author dropped on the
 * admin's frames page (a duplicate, a garbage sprite, a stray intro pose) came
 * straight back on the next import, because deleting it was an edit to generated
 * data.
 *
 * The deletion is therefore recorded here instead — one file per character,
 * `frame-edits.json` beside the `definition.json` it belongs with in @3xl/data's
 * public/characters/<id>/, the folder an additive import keeps as-is — and
 * replayed onto every freshly decoded manifest. The manifest stays generated;
 * what the author did to it is authored. (A wipe run deletes that folder, frame
 * edits along with the hand-tuned definition, which is what a wipe is for.)
 *
 * Both packages that touch the record live off this module: @3xl/mugen replays it
 * after a decode, @3xl/backend appends to it when the admin deletes a frame. Plain
 * JS with no dependencies, like ./registry.js and for the same reason — the backend
 * imports it under TypeScript (see ./frame-edits.d.ts).
 *
 * The file:
 *
 *   { "removed": { "action-210": [ { "index": 3, "frame": { … } } ] } }
 *
 * `index` is the frame's position in the *freshly decoded* animation, before any
 * of this record is applied — the one numbering that does not move as further
 * frames are dropped. `frame` is the removed frame's own content, which is what
 * finds it again when a re-imported archive has shifted the animation under the
 * record; omit it (or `null`) to match by index alone. To put a frame back, delete
 * its entry and re-run `pnpm generate:sprites <id>`.
 */
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @3xl/data's per-character folder — definition.json's own neighbours. */
const DEFINITIONS_DIR = join(__dirname, '../data/public/characters');

/** The frame fields that together identify one frame's content. */
const FRAME_FIELDS = ['file', 'anchorX', 'anchorY', 'duration'];

/**
 * Where one character's record lives. Ids are folder names, so anything that
 * could climb out of DEFINITIONS_DIR is refused (@3xl/backend holds request ids
 * to a stricter pattern of its own before it ever gets here).
 */
export function frameEditsPath(id) {
	if (!id || /[\\/]/.test(id) || id === '.' || id === '..') {
		throw new Error(`Invalid character id: ${id}`);
	}
	return join(DEFINITIONS_DIR, id, 'frame-edits.json');
}

/** Only the fields that identify a frame, dropping the ones it doesn't carry. */
function frameSummary(frame) {
	const summary = {};
	for (const field of FRAME_FIELDS) {
		if (frame && frame[field] !== undefined) summary[field] = frame[field];
	}
	return Object.keys(summary).length > 0 ? summary : null;
}

/** Whether a recorded `frame` says anything that could identify a frame. */
function describes(recorded) {
	return Boolean(recorded) && Object.keys(recorded).length > 0;
}

/** Whether a decoded frame is the one a record describes, on the fields it names. */
function matches(frame, recorded) {
	return FRAME_FIELDS.every(
		(field) => recorded[field] === undefined || frame?.[field] === recorded[field]
	);
}

/**
 * Bring any parsed shape to the canonical one: entries sorted by index, one per
 * index, animations with nothing left dropped. Everything that reads or writes the
 * record goes through this, so a hand-edited file and a generated one behave alike.
 */
function normalize(edits) {
	const source = edits && typeof edits === 'object' ? (edits.removed ?? {}) : {};
	const removed = {};
	for (const [animation, entries] of Object.entries(source)) {
		if (!Array.isArray(entries)) continue;
		const byIndex = new Map();
		for (const entry of entries) {
			if (!entry || !Number.isInteger(entry.index) || entry.index < 0) continue;
			if (byIndex.has(entry.index)) continue;
			byIndex.set(entry.index, { index: entry.index, frame: frameSummary(entry.frame) });
		}
		if (byIndex.size > 0) {
			removed[animation] = [...byIndex.values()].sort((a, b) => a.index - b.index);
		}
	}
	return { removed };
}

/**
 * One character's record, or an empty one when it has none. A file that will not
 * parse throws rather than reading as empty: silently ignoring it would put every
 * frame the author removed back on the next import, which is the failure this
 * whole module exists to prevent.
 */
export function readFrameEdits(id) {
	const path = frameEditsPath(id);
	if (!existsSync(path)) return { removed: {} };
	return normalize(JSON.parse(readFileSync(path, 'utf-8')));
}

/**
 * Persist one character's record, in the tab-indented style of the definition it
 * sits beside. A record with nothing in it is deleted rather than written, so a
 * character whose last edit was undone leaves no file behind.
 */
export function writeFrameEdits(id, edits) {
	const path = frameEditsPath(id);
	const normalized = normalize(edits);
	if (Object.keys(normalized.removed).length === 0) {
		rmSync(path, { force: true });
		return;
	}
	mkdirSync(dirname(path), { recursive: true });
	writeFileSync(path, JSON.stringify(normalized, null, '\t') + '\n', 'utf-8');
}

/**
 * Translate a position in the animation *as it stands now* into its position in
 * the freshly decoded one, given the indices already removed from it — the
 * numbering the record is kept in. Deleting the 4th cell on screen after an
 * earlier deletion is a deletion of the 5th decoded frame, and only the latter
 * still means the same thing on the next import.
 */
export function originalIndex(removedIndices, currentIndex) {
	const gone = new Set(removedIndices);
	let seen = 0;
	for (let original = 0; ; original++) {
		if (gone.has(original)) continue;
		if (seen === currentIndex) return original;
		seen++;
	}
}

/**
 * Add one deletion to a record and hand back the new one (the argument is not
 * mutated). `index` is the frame's position in the manifest as it stands, and
 * `frame` its content, both as the caller has them before the splice.
 */
export function recordFrameRemoval(edits, animation, index, frame) {
	const { removed } = normalize(edits);
	const entries = removed[animation] ?? [];
	removed[animation] = [
		...entries,
		{
			index: originalIndex(
				entries.map((e) => e.index),
				index
			),
			frame: frameSummary(frame)
		}
	].sort((a, b) => a.index - b.index);
	return { removed };
}

/**
 * Replay a record onto a freshly decoded manifest, in place.
 *
 * Returns `{ dropped, kept, warnings }`: how many frames came out, the record as
 * it now stands, and anything the caller should say out loud. `kept` is what
 * belongs back on disk — an entry naming a frame this decode no longer holds is
 * gone from it (the frame is restored rather than silently mis-applied to its
 * neighbour), and one the archive moved is renumbered to where the frame actually
 * landed. Keeping the record true to the manifest is what lets the next deletion's
 * index mean anything.
 *
 * An animation is never emptied, for the same reason @3xl/backend refuses to: a
 * definition binds slots by animation name, and a frameless one leaves a bound slot
 * with nothing to draw.
 */
export function applyFrameEdits(manifest, edits) {
	const { removed } = normalize(edits);
	const kept = {};
	const warnings = [];
	let dropped = 0;

	for (const [name, entries] of Object.entries(removed)) {
		const animation = manifest?.animations?.[name];
		if (!animation || !Array.isArray(animation.frames)) {
			warnings.push(
				`no animation "${name}" in this decode — ${entries.length} frame edit(s) dropped`
			);
			continue;
		}

		const frames = animation.frames;
		const drop = new Set();
		const survivors = [];
		for (const entry of entries) {
			if (drop.size + 1 >= frames.length) {
				warnings.push(`"${name}" would be left empty — its remaining frame edit(s) dropped`);
				break;
			}
			const target = locate(frames, entry, drop);
			if (target < 0) {
				warnings.push(
					`"${name}" no longer holds the frame removed at index ${entry.index} — restored`
				);
				continue;
			}
			drop.add(target);
			survivors.push({ index: target, frame: entry.frame });
		}

		if (drop.size > 0) animation.frames = frames.filter((_, index) => !drop.has(index));
		if (survivors.length > 0) kept[name] = survivors.sort((a, b) => a.index - b.index);
		dropped += drop.size;
	}

	return { dropped, kept: { removed: kept }, warnings };
}

/**
 * Which frame of a fresh decode an entry refers to, or -1. The recorded position
 * is tried first — an unchanged archive decodes to the same frames in the same
 * order, which is the ordinary case — and its content confirms it. Only when that
 * fails does the content go looking, so a re-imported archive that inserted a frame
 * ahead of this one still loses the right frame rather than its neighbour.
 */
function locate(frames, entry, drop) {
	const free = (index) => index >= 0 && index < frames.length && !drop.has(index);
	const described = describes(entry.frame);
	if (free(entry.index) && (!described || matches(frames[entry.index], entry.frame))) {
		return entry.index;
	}
	if (!described) return -1;
	return frames.findIndex((frame, index) => free(index) && matches(frame, entry.frame));
}
