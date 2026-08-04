/**
 * Regenerates @3xl/data's `registry.generated.ts` from the character definitions
 * on disk.
 *
 * Lives on its own — rather than inside ./import-mugen.js, which owns it
 * otherwise — because the registry is derived from the definition JSONs, and
 * anything that edits one of those has to rewrite it: the importer after an
 * archive lands, and @3xl/backend after the admin renames a character. Kept free
 * of the decoder's dependencies (pngjs / sff-extractor) so a consumer that only
 * needs the registry rewritten doesn't pull the whole sprite pipeline in.
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Where the per-character definition JSONs live (@3xl/data's public root). */
const DEFINITIONS_DIR = join(__dirname, '../data/public/characters');
/** Decoded frames + manifests (@3xl/assets). Mirrors generate-sprites' ASSETS_DIR. */
const ASSETS_DIR = join(__dirname, '../assets/public');
/** The generated module itself. */
const REGISTRY_FILE = join(__dirname, '../data/registry.generated.ts');

/**
 * Who made a character's sprites, off the decoded manifest.
 *
 * The credit is the one thing about a character that is not in its definition: it comes
 * out of the archive's own `[Info] author` (or a sheet's sidecar) and is written into the
 * manifest by generate-sprites, so it is re-read here rather than authored anywhere. The
 * game's credits screen is a list of every character with its artist beside it, and a
 * screen cannot ask for fifty manifests — each is hundreds of kilobytes of frame
 * geometry — so the one line of it that is *about* the character rather than about its
 * pixels is carried in the registry, which the game already has as a module.
 *
 * A manifest with no author reads `Unknown`, which is what the decoders write when the
 * archive itself does not say.
 */
function readAuthor(id) {
	const manifestPath = join(ASSETS_DIR, id, 'frames', 'manifest.json');
	try {
		return JSON.parse(readFileSync(manifestPath, 'utf-8')).author || 'Unknown';
	} catch {
		return 'Unknown';
	}
}

/**
 * Rewrite @3xl/data's registry.generated.ts from every definition JSON on disk.
 * Returns how many characters the registry now lists.
 */
export function regenerateRegistry() {
	// Definitions live one per character under characters/<id>/definition.json,
	// so walk the id subdirectories rather than expecting flat *.json files.
	const defs = readdirSync(DEFINITIONS_DIR, { withFileTypes: true })
		.filter((entry) => entry.isDirectory())
		.map((entry) => join(DEFINITIONS_DIR, entry.name, 'definition.json'))
		.filter((defPath) => existsSync(defPath))
		.map((defPath) => JSON.parse(readFileSync(defPath, 'utf-8')))
		// Only list characters whose decoded frames actually exist.
		.filter((d) => existsSync(join(ASSETS_DIR, d.id, 'frames', 'manifest.json')))
		.map((d) => ({ ...d, author: readAuthor(d.id) }))
		.sort((a, b) => a.label.localeCompare(b.label));

	// Single-quote strings to match the repo's Prettier style; escape any quote
	// the display name might contain.
	const quote = (s) => `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
	const entries = defs
		.map(
			(d) =>
				`\t{ id: ${quote(d.id)}, label: ${quote(d.label)}, basePath: ${quote(d.basePath)}, author: ${quote(d.author)} }`
		)
		.join(',\n');

	const contents = `/**
 * Registry of playable MUGEN characters. Each entry points at a folder served
 * from the @3xl/assets package (manifest.json + frame PNGs) under \`/assets/\`.
 *
 * GENERATED from the character definitions in @3xl/data's
 * public/characters/<id>/definition.json by @3xl/mugen's registry.js — run
 * \`pnpm import:mugen\` to add characters rather than editing this file by hand.
 */
import type { CharacterOption } from './index';

export const registry: CharacterOption[] = [
${entries}
];
`;

	writeFileSync(REGISTRY_FILE, contents, 'utf-8');
	return defs.length;
}
