/**
 * What a fighter's colour predisposes it to in the stand-off. Pure functions — no
 * side effects.
 *
 * Combat is the schoolyard charge/defend/shoot game (see the frontend's combat
 * controller), and its three moves are the same for everybody. A card's **colour**
 * is therefore the whole of its character: each primary bends the rules in exactly
 * one way, and nothing else about a spawn changes how its turn works.
 *
 *   · red    → it may fire **on top of** a non-attacking move (charge or defend).
 *   · yellow → it **starts** the battle with one charge already banked.
 *   · blue   → the **first** shot to reach it on a turn it isn't defending is turned
 *              aside for free. One shot, once in the battle.
 *
 * A compound colour carries the traits of the two primaries it mixes, and only
 * those — so purple (red + blue) shoots off a defend and shrugs off a bullet, but
 * starts empty; orange (red + yellow) opens armed and shoots off a defend, but is
 * bare when it doesn't; green (blue + yellow) opens armed and guards, but never
 * gets a second action. No colour carries all three, so every card gives something
 * up.
 */
import {
	COMPOUND_COMPONENTS,
	type CombatColor,
	type PrimaryColor
} from '../../types/character-definition.type';
import { isPrimaryColor } from './compare';

/** The rule bends a fighter's colour grants it, one flag per primary colour. */
export interface ColorTraits {
	/**
	 * Red: the fighter may add a shot to a turn it spends charging or defending.
	 * Never to a turn it already spends shooting — the extra shot rides on a
	 * *non-attacking* move, so nobody fires twice.
	 */
	doubleAction: boolean;
	/** Yellow: the fighter enters the battle with one charge already banked. */
	headStart: boolean;
	/**
	 * Blue: the first shot to reach the fighter on a turn it isn't defending is turned
	 * aside anyway. It is worth **one shot in the whole battle**, not one a turn —
	 * shots come straight across the lane, so a fighter takes at most one a turn and a
	 * guard that came back each turn would simply never let anything through.
	 */
	passiveGuard: boolean;
}

/** Which trait each primary colour grants. A compound grants its components'. */
const PRIMARY_TRAIT: Record<PrimaryColor, keyof ColorTraits> = {
	red: 'doubleAction',
	yellow: 'headStart',
	blue: 'passiveGuard'
};

/**
 * The glyph each of the three orders is drawn with, from the game-icons.net set in
 * @3xl/assets: gathering energy to charge, a shield to defend, a sword to shoot. The
 * board puts these under a fighter and the cards carry them in their corners, so they
 * are named once, here, beside the colours that bend them.
 *
 * They go into a canvas (a Pixi texture), so they are named by URL rather than by the
 * `<folder>/<slug>` an inlined icon goes by — see the icon note in CLAUDE.md.
 */
export const ORDER_ICONS = {
	charge: '/assets/icons/lorc/rolling-energy.svg',
	defend: '/assets/icons/lorc/bordered-shield.svg',
	shoot: '/assets/icons/lorc/broadsword.svg'
} as const;

/** The order each primary's trait bends: red fires an extra shot, yellow opens with a
 * charge banked, blue guards without spending a turn on it. */
const PRIMARY_ORDER: Record<PrimaryColor, keyof typeof ORDER_ICONS> = {
	red: 'shoot',
	yellow: 'charge',
	blue: 'defend'
};

/**
 * The glyphs standing for what a fighter of `color` fights with: one for a primary,
 * two — in component order — for a compound. Exactly {@link colorTraits}, told as
 * pictures.
 */
export function traitIcons(color: CombatColor): string[] {
	const primaries: PrimaryColor[] = isPrimaryColor(color) ? [color] : COMPOUND_COMPONENTS[color];
	return primaries.map((primary) => ORDER_ICONS[PRIMARY_ORDER[primary]]);
}

/**
 * The traits a fighter of `color` fights with: the one its primary grants, or —
 * for a compound — the two its components grant between them.
 */
export function colorTraits(color: CombatColor): ColorTraits {
	const traits: ColorTraits = { doubleAction: false, headStart: false, passiveGuard: false };
	const primaries: PrimaryColor[] = isPrimaryColor(color) ? [color] : COMPOUND_COMPONENTS[color];
	for (const primary of primaries) traits[PRIMARY_TRAIT[primary]] = true;
	return traits;
}
