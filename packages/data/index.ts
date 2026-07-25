/**
 * @3xl/data — character registry and definitions.
 *
 * The `registry` array in registry.generated.ts is written by @3xl/mugen's
 * import-mugen.js. Per-character data lives together under
 * public/characters/<id>/ (definition.json + mugen-moves.json), served by the
 * frontend at `/data/characters/<id>/definition.json` and
 * `/data/characters/<id>/mugen-moves.json`. Unrelated map data (the Països
 * Catalans GeoJSON layers) is kept separate under public/geo/.
 */
import { registry } from './registry.generated';

export interface CharacterOption {
	/** Stable id, matches the /assets/<id>/ folder and public/characters/<id>/definition.json. */
	id: string;
	/** Human-readable name shown in the picker. */
	label: string;
	/** Folder (served) with manifest.json + frames, e.g. `/assets/<id>/frames`. */
	basePath: string;
}

export const characters: CharacterOption[] = registry;

export const defaultCharacterId = characters[0].id;
