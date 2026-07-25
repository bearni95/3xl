/**
 * Our own character format. Each MUGEN character ships a generated manifest
 * (scripts/generate-sprites.js) exposing 80-100+ raw animations keyed by name
 * (`idle`, `walk`, `action-200`, …). A CharacterDefinition binds a small,
 * meaningful subset of those raw animations to the logical slots the game
 * actually drives — the movement animations the root page plays, plus three
 * combat moves — and layers custom gameplay params on top.
 *
 * Definitions live as JSON in @3xl/data under `public/characters/<id>/definition.json`,
 * are committed to the git tree, and are edited from /admin/characters through
 * the backend write API at `packages/backend/src/routes/characters.ts`.
 */

/**
 * A logical animation slot bound to a raw manifest animation key. `source` is a
 * key from the character's `manifest.json` `animations` map; an empty string
 * means the slot is not yet assigned.
 */
export interface AnimationBinding {
	/** Raw manifest animation key this slot maps to (`''` = unassigned). */
	source: string;
	/** Whether playback loops. */
	loop: boolean;
}

/**
 * One combat move a character defines. Characters no longer share a fixed
 * template of move slots — each declares its own list of moves, every entry
 * linking a raw manifest animation to one of the shared move types and giving
 * it a character-specific name ("Kamehameha", not "Ranged").
 */
export interface CharacterMove {
	/** Character-specific display name for this move. */
	name: string;
	/** Which shared move type this move fulfils (its tag). */
	type: MoveKind;
	/** Raw manifest animation key that plays for this move (`''` = unassigned). */
	source: string;
	/**
	 * The sprite that flies when this move fires. Only meaningful on moves whose
	 * type is in {@link PROJECTILE_MOVES} (ranged and final).
	 */
	projectile?: AnimationBinding;
}

/**
 * The base movement states the game loop drives. Directional movement lives
 * separately in `directions` (see below); these are the non-directional poses,
 * including the hurt flinch every character defines. Moved into data so a
 * character's movement can be re-bound without touching the player code.
 */
export type MovementAnimationName = 'idle' | 'jump' | 'fall' | 'hurt';

/**
 * Directional movement. There is no walk/run split anymore — a single animation
 * per direction. `move-right` inherits what `run` used to be.
 */
export type DirectionName = 'move-left' | 'move-right';

/** The shared move types a character's moves can be tagged with. */
export type MoveKind = 'melee' | 'ranged' | 'final' | 'defent';

/** The three primary combat colors; each beats the next in a cycle. */
export type PrimaryColor = 'red' | 'blue' | 'yellow';

/** The three compound combat colors a character can be; each is a mix of two
 * primaries and beats the next compound in a cycle. */
export type CompoundColor = 'purple' | 'orange' | 'green';

/** Any color a move can be thrown as: a compound or one of its components. */
export type CombatColor = PrimaryColor | CompoundColor;

/** The two primary components each compound color mixes. */
export const COMPOUND_COMPONENTS: Record<CompoundColor, [PrimaryColor, PrimaryColor]> = {
	purple: ['red', 'blue'],
	orange: ['red', 'yellow'],
	green: ['blue', 'yellow']
};

/** Value used when a definition predates colors or carries an invalid one. */
export const DEFAULT_COLOR: CompoundColor = 'purple';

/** Compound colors in display order (also what definitions may declare). */
export const COMPOUND_COLORS: CompoundColor[] = ['purple', 'orange', 'green'];

/** The gameplay stat slots every character defines. */
export type StatKind = 'atk' | 'def' | 'hp';

/** Combat stats, each an integer in the inclusive range [STAT_MIN, STAT_MAX]. */
export type CharacterStats = Record<StatKind, number>;

export interface CharacterDefinition {
	/** Stable id, matches `/assets/<id>/` and `public/characters/<id>/definition.json`. */
	id: string;
	/** Human-readable name shown in pickers. */
	label: string;
	/** Folder (relative to the static root) with manifest.json + frames. */
	basePath: string;
	/** Non-directional movement states (idle/jump/fall/hurt), keyed by logical name. */
	animations: Record<MovementAnimationName, AnimationBinding>;
	/** Directional movement (move-left/move-right), keyed by direction. */
	directions: Record<DirectionName, AnimationBinding>;
	/**
	 * The moves this character defines. Each entry tags a raw animation with a
	 * shared move type and names it; projectile-firing moves carry their own
	 * projectile binding inline.
	 */
	moves: CharacterMove[];
	/** Gameplay stats (atk/def/hp), each an integer in [STAT_MIN, STAT_MAX]. */
	stats: CharacterStats;
	/** This character's compound combat color, driving the color RPS in combat. */
	color: CompoundColor;
}

/** Non-directional movement slots in render/display order. */
export const MOVEMENT_ANIMATIONS: MovementAnimationName[] = ['idle', 'jump', 'fall', 'hurt'];

/** Direction slots in display order. */
export const DIRECTION_NAMES: DirectionName[] = ['move-left', 'move-right'];

/** Shared move types in display order. */
export const MOVE_KINDS: MoveKind[] = ['melee', 'ranged', 'final', 'defent'];

/** Move types that fire a projectile (the move carries its own binding). */
export const PROJECTILE_MOVES: MoveKind[] = ['ranged', 'final'];

/**
 * First move a character has tagged with `type` that actually has an animation
 * bound — the game's way of resolving a logical move type ("play the hurt
 * pose") against a character's own move list.
 */
export function findMove(
	definition: Pick<CharacterDefinition, 'moves'>,
	type: MoveKind
): CharacterMove | undefined {
	return definition.moves.find((move) => move.type === type && move.source !== '');
}

/** Stat slots in display order. */
export const STAT_KINDS: StatKind[] = ['atk', 'def', 'hp'];

/** Inclusive bounds every stat is clamped to. */
export const STAT_MIN = 1;
export const STAT_MAX = 10;

/** Value used when a definition predates stats or carries an invalid one. */
export const DEFAULT_STAT = 5;
