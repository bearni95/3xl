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
 *   · blue   → one shot is turned aside for free on any turn it isn't defending.
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
	 * Blue: on any turn the fighter doesn't spend defending, the first shot aimed at
	 * it is turned aside anyway. It stops one shot per turn, not one per battle, and
	 * a second shot in the same turn goes through — so focused fire is what answers
	 * it.
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
 * The traits a fighter of `color` fights with: the one its primary grants, or —
 * for a compound — the two its components grant between them.
 */
export function colorTraits(color: CombatColor): ColorTraits {
	const traits: ColorTraits = { doubleAction: false, headStart: false, passiveGuard: false };
	const primaries: PrimaryColor[] = isPrimaryColor(color) ? [color] : COMPOUND_COMPONENTS[color];
	for (const primary of primaries) traits[PRIMARY_TRAIT[primary]] = true;
	return traits;
}
