/**
 * Every animation a definition binds, as one list
 *
 * A {@link CharacterDefinition} spreads its animation bindings over three places —
 * the non-directional poses (`animations`), the two directions (`directions`) and
 * the character's own combat moves (`moves`) — because each is driven by something
 * different at play time. A surface that only wants to *show* what a character has
 * bound cares about none of that: it wants the manifest keys, named, in an order
 * that reads.
 *
 * Which is this. The character standing, then the two ways it moves, then its hit
 * flinch, then a move per entry it declares. Unassigned slots are left out rather
 * than reported as empty: a character with no ranged move has nothing to show for
 * one, and a blank box saying so is not the same as the animation it doesn't have.
 */

import {
	DIRECTION_NAMES,
	type CharacterDefinition,
	type MovementAnimationName
} from '../../types/character-definition.type';

/** One bound animation: what it is in the definition, and what plays for it. */
export interface DefinitionAnimation {
	/** What this animation is — the slot's name, or the move's own name. */
	label: string;
	/** Raw manifest animation key that plays for it. */
	source: string;
}

/**
 * The order the poses read in: the character standing first, since that is what it
 * is when nothing is happening to it. `MOVEMENT_ANIMATIONS` is the definition's own
 * pair and keeps the flinch next to the idle; here the directions come between them,
 * so the list runs from what the character does under its own power to what is done
 * to it.
 */
const IDLE: MovementAnimationName = 'idle';
const HURT: MovementAnimationName = 'hurt';

/**
 * Every animation `definition` binds, in display order, skipping the slots it leaves
 * unassigned. A move with no name of its own is labelled by its type — that is what
 * the move is until somebody names it.
 */
export function definitionAnimations(definition: CharacterDefinition): DefinitionAnimation[] {
	const bound: DefinitionAnimation[] = [];

	const push = (label: string, source: string | undefined) => {
		if (source) bound.push({ label, source });
	};

	push(IDLE, definition.animations?.[IDLE]?.source);
	for (const name of DIRECTION_NAMES) push(name, definition.directions?.[name]?.source);
	push(HURT, definition.animations?.[HURT]?.source);
	for (const move of definition.moves ?? []) push(move.name.trim() || move.type, move.source);

	return bound;
}
