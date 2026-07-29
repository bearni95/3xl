/**
 * A character's authored render scale, fetched for the surface that is drawing it.
 *
 * The correction itself lives in the character's own definition JSON
 * (`CharacterDefinition.renderScale`) — that is where it is authored, committed and
 * read back by the admin. What this module does is get it to the code that sizes
 * sprites, which everywhere in this app knows a character by its *frames folder*
 * (`/assets/<id>/frames`) and nothing else: a statue is handed one, a card model
 * carries one, the board loads its animations from one. So the folder is what is
 * asked here, the id is read back out of it, and the definition is fetched by id —
 * the same two steps the board already took to load a character's bindings, and the
 * same `/data/characters/<id>/definition.json` the admin writes.
 *
 * Every character's id, frames folder and definition path are one and the same name
 * by construction (see `CharacterDefinition.id`); a test over the real registry holds
 * that invariant, so this stops working loudly rather than by quietly drawing
 * everybody at 1.
 */

import {
	DEFAULT_RENDER_SCALE,
	RENDER_SCALE_MAX,
	RENDER_SCALE_MIN,
	type CharacterDefinition
} from '../../types/character-definition.type';

/**
 * The character id inside a served frames folder — `/assets/inuyasha/frames` is
 * `inuyasha`. Null when the path has no such segment, which is what a hand-written
 * or renamed folder would give.
 */
export function characterIdFromFramesPath(basePath: string | null): string | null {
	if (!basePath) return null;
	const segments = basePath.split('/').filter(Boolean);
	// The id is the folder the frames folder sits in; a path that is only `frames`
	// (or only an id) names no character.
	if (segments.length < 2) return null;
	const last = segments[segments.length - 1];
	const id = last === 'frames' ? segments[segments.length - 2] : last;
	return id || null;
}

/** A stored scale, or {@link DEFAULT_RENDER_SCALE} for anything absent, unparseable
 * or outside the authored range. Shared with the fit so a bad value means "no
 * correction" in one place. */
export function readRenderScale(definition: Partial<CharacterDefinition> | null): number {
	const scale = definition?.renderScale;
	return typeof scale === 'number' &&
		Number.isFinite(scale) &&
		scale >= RENDER_SCALE_MIN &&
		scale <= RENDER_SCALE_MAX
		? scale
		: DEFAULT_RENDER_SCALE;
}

// One entry per frames folder, kept for the session: a character's scale is a fact
// about its art, so the fetch happens once however many statues, cards and actors
// ask for it. Failures are cached as the default too — a surface that resized while
// the network was down must not re-ask on every measurement.
const scales = new Map<string, number>();
const pending = new Map<string, Promise<number>>();

/**
 * The render scale for the character whose frames live at `basePath`, defaulting to
 * 1 for a character that authored none (and for any failure to read it — a missing
 * correction draws the character as it always was, which is never worse than
 * drawing nothing).
 */
export function loadRenderScale(basePath: string | null): Promise<number> {
	if (!basePath) return Promise.resolve(DEFAULT_RENDER_SCALE);
	const cached = scales.get(basePath);
	if (cached !== undefined) return Promise.resolve(cached);
	const inFlight = pending.get(basePath);
	if (inFlight) return inFlight;

	const id = characterIdFromFramesPath(basePath);
	if (!id) return Promise.resolve(DEFAULT_RENDER_SCALE);

	const promise = (async () => {
		try {
			const response = await fetch(`/data/characters/${id}/definition.json`);
			if (!response.ok) return DEFAULT_RENDER_SCALE;
			return readRenderScale((await response.json()) as Partial<CharacterDefinition>);
		} catch {
			return DEFAULT_RENDER_SCALE;
		} finally {
			pending.delete(basePath);
		}
	})().then((scale) => {
		scales.set(basePath, scale);
		return scale;
	});
	pending.set(basePath, promise);
	return promise;
}
