/**
 * @3xl/data — character registry and definitions.
 *
 * The `registry` array in registry.generated.ts is written by @3xl/mugen's
 * import-mugen.js. The JSON definitions and movesets under public/ are served
 * by the frontend at `/data/characters/<id>.json` and `/data/<id>/mugen-moves.json`.
 */
import { registry } from './registry.generated';

export interface CharacterOption {
	/** Stable id, matches the /assets/<id>/ folder and public/characters/<id>.json. */
	id: string;
	/** Human-readable name shown in the picker. */
	label: string;
	/** Folder (served) with manifest.json + frames, e.g. `/assets/<id>/frames`. */
	basePath: string;
}

export const characters: CharacterOption[] = registry;

export const defaultCharacterId = characters[0].id;
