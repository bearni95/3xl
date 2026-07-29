// The six spawn colours as Tailwind classes.
//
// Written out in full, one literal per swatch: Tailwind only emits a class it can
// see spelled in the source, so these can never be built from a colour name at
// runtime. Kept in one module because every surface that paints a card's colour —
// the team strip, the map's pins — must paint the *same* six, and a second copy is
// how two of them come to disagree.
//
// The Pixi canvases do not read these: a canvas takes 24-bit hex, which is
// `SPAWN_COLOR_HEX` in @3xl/shared. These are the document's half of the same
// palette, and the comment there is what keeps the two in step.

import { SpawnColor } from '$types/character-spawn.type';

/** The colour as a fill. */
export const SPAWN_FILL_CLASSES: Record<SpawnColor, string> = {
	[SpawnColor.Red]: 'bg-red-500',
	[SpawnColor.Yellow]: 'bg-yellow-400',
	[SpawnColor.Blue]: 'bg-blue-500',
	[SpawnColor.Orange]: 'bg-orange-500',
	[SpawnColor.Green]: 'bg-green-500',
	[SpawnColor.Purple]: 'bg-purple-500'
};

/** The colour as a fill, with the ink that reads on it — yellow is the one light
 * enough to want black. */
export const SPAWN_PANEL_CLASSES: Record<SpawnColor, string> = {
	[SpawnColor.Red]: 'bg-red-500 text-white',
	[SpawnColor.Yellow]: 'bg-yellow-400 text-black',
	[SpawnColor.Blue]: 'bg-blue-500 text-white',
	[SpawnColor.Orange]: 'bg-orange-500 text-white',
	[SpawnColor.Green]: 'bg-green-500 text-white',
	[SpawnColor.Purple]: 'bg-purple-500 text-white'
};

/** The colour as a border. */
export const SPAWN_BORDER_CLASSES: Record<SpawnColor, string> = {
	[SpawnColor.Red]: 'border-red-500',
	[SpawnColor.Yellow]: 'border-yellow-400',
	[SpawnColor.Blue]: 'border-blue-500',
	[SpawnColor.Orange]: 'border-orange-500',
	[SpawnColor.Green]: 'border-green-500',
	[SpawnColor.Purple]: 'border-purple-500'
};

/**
 * The colour as a character, for the one place a class cannot reach: the inside of a
 * native `<option>`, which the browser draws itself and no stylesheet gets at. The six
 * squares happen to be exactly the six colours, and they carry their own names for a
 * screen reader ("large red square"), so an option can say its colour without a swatch
 * element to paint.
 */
export const SPAWN_SQUARE_GLYPHS: Record<SpawnColor, string> = {
	[SpawnColor.Red]: '🟥',
	[SpawnColor.Yellow]: '🟨',
	[SpawnColor.Blue]: '🟦',
	[SpawnColor.Orange]: '🟧',
	[SpawnColor.Green]: '🟩',
	[SpawnColor.Purple]: '🟪'
};
