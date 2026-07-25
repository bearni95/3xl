/**
 * The raw MUGEN moveset scripts/import-mugen.js extracts from a character's
 * .cmd (input commands + [State -1] triggers) and .cns/.st state files
 * (animation, movetype, HitDef damage). Written as generated data to
 * `static/<id>/mugen-moves.json` and shown read-only on the /admin/characters
 * "Imported" tab — distinct from CharacterDefinition, which is the hand-tuned
 * binding the game actually plays.
 */

/** One `[Command]` block from the .cmd: a named input in MUGEN notation. */
export interface MugenCommand {
	/** Command name referenced by move triggers (e.g. `"QCF_x"`). */
	name: string;
	/** Raw MUGEN input notation (e.g. `~D, DF, F, x`). */
	input: string;
}

/** One move: a state reachable from `[State -1]`, with everything known about it. */
export interface MugenImportedMove {
	/** Human label from the `[State -1, Label]` header (or best fallback). */
	name: string;
	/** MUGEN state number the move jumps to. */
	stateNo: number;
	/** Names of the commands that trigger the move (empty = AI/auto only). */
	commands: string[];
	/** Input notation for each trigger command, aligned with `commands`. */
	inputs: string[];
	/** Statedef movetype: 'A' attack, 'I' idle, 'H' hurt, '' unknown. */
	movetype: string;
	/** First HitDef/Projectile damage in the state, or null when none found. */
	damage: number | null;
	/** Raw .air action number the statedef plays, or null when unknown. */
	anim: number | null;
	/** Manifest animation key for `anim`, verified to exist (`''` = none). */
	animation: string;
}

/** The full extracted moveset for one character. */
export interface MugenImportedMoveset {
	/** Character display name from the manifest. */
	name: string;
	/** Every named input command the .cmd declares. */
	commands: MugenCommand[];
	/** Every `[State -1]`-reachable move, sorted by state number. */
	moves: MugenImportedMove[];
}
