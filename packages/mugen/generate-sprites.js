/**
 * MUGEN sprite-decoding helpers, consumed by import-mugen.js (`pnpm import:mugen`,
 * which imports raw archives from mugen-characters/). Also runnable directly as
 * `pnpm generate:sprites [id…]` to re-decode frames + manifest from the raw files
 * already copied into characters-src/ — without re-importing archives or touching
 * the registry. Use it after changing what the manifest emits (e.g. portraits).
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync } from 'fs';
import { fileURLToPath, pathToFileURL } from 'url';
import { dirname, join } from 'path';
import extract from 'sff-extractor';
import { PNG } from 'pngjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Raw MUGEN inputs (.sff/.air/.def/.cmd/.cns/.act) copied in by import-mugen.js.
export const SRC_DIR = join(__dirname, 'characters-src');
// Decoded output: frame PNGs + manifest.json, served by the frontend at /assets.
export const ASSETS_DIR = join(__dirname, '../assets/public');

// MUGEN logic runs at 60 game-ticks per second.
const TICKS_PER_SECOND = 60;

// Every action defined in a character's .air is exported. Well-known standard
// MUGEN action numbers get a friendly name; everything else (character-specific
// attacks, specials, intros, …) is labelled `action-<N>`. The renderer's game
// loop only references the movement names below (idle/walk/run/jump/fall), so
// those must keep these exact names — see src/utils/mugen/mugen-player.ts.
export const STANDARD_NAMES = {
	0: 'idle',
	5: 'turn',
	6: 'crouch-turn',
	10: 'crouch-down',
	11: 'crouch',
	12: 'stand-up',
	20: 'walk',
	21: 'walk-back',
	40: 'jump-start',
	41: 'jump',
	42: 'fall',
	100: 'run',
	105: 'run-back',
	120: 'guard-start',
	130: 'guard-stand',
	131: 'guard-crouch',
	132: 'guard-air',
	150: 'guard-stand-hit',
	151: 'guard-crouch-hit',
	152: 'guard-air-hit',
	195: 'dizzy'
};

/**
 * Parse every [Begin Action N] block from a MUGEN .air file, in file order,
 * into { action, frames } records. Frame lines look like:
 *   group, image, offsetX, offsetY, ticks [, flip] [, blend]
 * Clsn (collision box), Loopstart markers, blank (-1) frames and comments are
 * ignored. Duplicate action numbers keep their first definition.
 */
export function parseAllActions(airText) {
	const lines = airText.split(/\r?\n/);
	const actions = [];
	const seen = new Set();
	let current = null;

	for (const raw of lines) {
		const line = raw.split(';')[0].trim();
		if (!line) continue;

		// Action numbers may be zero-padded (e.g. "Begin Action 020").
		const begin = line.match(/^\[\s*Begin\s+Action\s+(-?\d+)\s*\]$/i);
		if (begin) {
			const action = Number(begin[1]);
			if (seen.has(action)) {
				current = null; // Ignore a repeated action block.
				continue;
			}
			seen.add(action);
			current = { action, frames: [] };
			actions.push(current);
			continue;
		}
		if (!current) continue;

		// Skip collision-box definitions and loop markers.
		if (/^Clsn/i.test(line) || /^Loopstart/i.test(line)) continue;

		const parts = line.split(',').map((p) => p.trim());
		if (parts.length < 5) continue;

		const [group, image, offsetX, offsetY, ticks] = parts.map(Number);
		if ([group, image, offsetX, offsetY, ticks].some(Number.isNaN)) continue;

		// Blank/timing frames (group or image -1) render nothing — drop them.
		if (group < 0 || image < 0) continue;

		current.frames.push({ group, image, offsetX, offsetY, ticks });
	}

	return actions.filter((a) => a.frames.length > 0);
}

/**
 * Per-character default-palette overrides, keyed by characters-src/ folder.
 * The automatic pick (findDefaultPalette → first resolving palN) is right for
 * most SFF v1 characters, but a few .defs ship a pal1 that isn't the character's
 * canonical look and declare no usable default in metadata. VinceJ's Kagome is
 * one: pal1 (final_kagome.act) is a blue recolour and pal.defaults points at a
 * brown alt, while her green school-uniform seifuku — the look on her own versus
 * portrait — is pal2 (idunno.act). The value is an .act filename resolved
 * case-insensitively against the character's src dir (subfolders allowed).
 */
export const PALETTE_OVERRIDES = {
	kagome: 'idunno.act'
};

/** Assign a unique animation name for an action number. */
function nameForAction(action, used) {
	let base = STANDARD_NAMES[action] ?? `action-${action}`;
	let name = base;
	let suffix = 2;
	while (used.has(name)) name = `${base}-${suffix++}`;
	used.add(name);
	return name;
}

/**
 * Resolve a file reference from a .def that may point into a subfolder
 * (`pal1 = pal/rice/kagura1.act`) against `dir`, matching every path segment
 * case-insensitively — .def references routinely mismatch the real on-disk
 * case. Returns the real relative path within `dir`, or null.
 */
export function resolveRelPath(dir, ref) {
	if (!ref) return null;
	const segments = ref.replace(/\\/g, '/').split('/').filter(Boolean);
	const resolved = [];
	let current = dir;
	try {
		for (const segment of segments) {
			const match = readdirSync(current).find((e) => e.toLowerCase() === segment.toLowerCase());
			if (!match) return null;
			resolved.push(match);
			current = join(current, match);
		}
	} catch {
		return null; // A mid-path segment matched a file, not a folder.
	}
	return resolved.join('/');
}

/**
 * The character's default palette: the first palN .act file declared in the
 * .def [Files] section that actually resolves on disk, or null. SFF v1
 * characters frequently store a black/placeholder shared palette in the .sff
 * and rely on MUGEN loading pal1 at runtime for the real colors.
 */
function findDefaultPalette(charDir, defText) {
	for (let i = 1; i <= 12; i++) {
		const m = defText.match(new RegExp(`^\\s*pal${i}\\s*=\\s*"?([^";\\r\\n]*)`, 'im'));
		const rel = m && resolveRelPath(charDir, m[1].trim());
		if (rel) return join(charDir, rel);
	}
	return null;
}

/** Pull display name + author out of a MUGEN .def [Info] section. */
export function parseDefInfo(defText) {
	const read = (key) => {
		const match = defText.match(new RegExp(`^\\s*${key}\\s*=\\s*"?([^";\\r\\n]*)`, 'im'));
		return match ? match[1].trim() : '';
	};
	return {
		name: read('displayname') || read('name') || 'Unknown',
		author: read('author') || 'Unknown'
	};
}

/** Write an RGBA buffer of the given size to a PNG file. */
function writePng(path, rgba, width, height) {
	const png = new PNG({ width, height });
	rgba.copy(png.data);
	writeFileSync(path, PNG.sync.write(png));
}

/**
 * Decode one character's animations into @3xl/assets public/<dir>/frames/ +
 * manifest.json, reading the raw MUGEN files from characters-src/<dir>/.
 * Returns the written manifest so callers (e.g. the importer) can auto-bind a
 * character definition from the animation keys it produced.
 */
export function buildCharacter(character) {
	const srcDir = join(SRC_DIR, character.dir);
	const outDir = join(ASSETS_DIR, character.dir, 'frames');
	const airText = readFileSync(join(srcDir, character.air), 'utf-8');
	const defText = readFileSync(join(srcDir, character.def), 'utf-8');
	const info = parseDefInfo(defText);

	const actions = parseAllActions(airText);

	// Decode every sprite referenced by any action. sff-extractor reads the
	// Elecbyte SFF container and applies the character's embedded palette, giving
	// straight RGBA (palette index 0 becomes transparent).
	// Group 9000 holds the MUGEN portraits (the character's "face"): 9000,1 is the
	// large versus portrait, 9000,0 the small select-screen one. It's not referenced
	// by any .air action, so add it explicitly to get it decoded.
	//
	// SFF v1 characters (major version byte 1) often ship an all-black
	// placeholder as the embedded shared palette and rely on MUGEN applying the
	// .def's pal1 .act at load time. Feed that palette to the decoder — it only
	// affects shared-palette sprites, so sprites carrying their own palette
	// (portraits, effects) are untouched. SFF v2 embeds real palettes and never
	// needs this.
	const sffBuffer = readFileSync(join(srcDir, character.sff));
	const overrideRel = PALETTE_OVERRIDES[character.dir]
		? resolveRelPath(srcDir, PALETTE_OVERRIDES[character.dir])
		: null;
	const actPath =
		sffBuffer.readUInt8(15) === 1
			? overrideRel
				? join(srcDir, overrideRel)
				: findDefaultPalette(srcDir, defText)
			: null;
	const groups = [...new Set([9000, ...actions.flatMap((a) => a.frames.map((f) => f.group))])];
	const data = extract(sffBuffer, {
		palettes: false,
		spriteBuffer: false,
		decodeSpriteBuffer: true,
		spriteGroups: groups,
		// ACT files are exactly 768 bytes (256 RGB triples); tolerate padded ones.
		applyPalette: actPath ? readFileSync(actPath).subarray(0, 768) : null
	});

	const spriteByKey = new Map();
	for (const sprite of data.sprites) {
		spriteByKey.set(`${sprite.group},${sprite.number}`, sprite);
	}

	rmSync(outDir, { recursive: true, force: true });
	mkdirSync(outDir, { recursive: true });

	// Each distinct sprite is written to one shared PNG and reused across every
	// frame/animation that references it (offsets and durations stay per-frame).
	const spriteFiles = new Map();
	const writeSprite = (group, image) => {
		const key = `${group},${image}`;
		if (spriteFiles.has(key)) return spriteFiles.get(key);
		const sprite = spriteByKey.get(key);
		if (!sprite) return null;
		const file = `spr_${group}_${image}.png`;
		writePng(join(outDir, file), sprite.decodedBuffer, sprite.width, sprite.height);
		spriteFiles.set(key, file);
		return file;
	};

	// Portraits: MUGEN group 9000 holds every portrait a character ships — 9000,0
	// the small select-screen avatar, 9000,1 the large versus face, plus any extra
	// alternates. Decode and write them all (in image-number order) so the admin
	// Faces tab can offer every one; `faces` lists them, `face` keeps the historical
	// single default (large versus portrait, else the small avatar) for consumers
	// that read one portrait.
	const faces = [];
	for (const sprite of data.sprites) {
		if (sprite.group !== 9000) continue;
		const file = writeSprite(9000, sprite.number);
		if (!file) continue;
		faces.push({ file, image: sprite.number, width: sprite.width, height: sprite.height });
	}
	faces.sort((a, b) => a.image - b.image);
	const preferred =
		faces.find((f) => f.image === 1) ?? faces.find((f) => f.image === 0) ?? faces[0] ?? null;
	// Keep `face` byte-identical to the pre-`faces` shape (no `image` key).
	const face = preferred
		? { file: preferred.file, width: preferred.width, height: preferred.height }
		: null;

	const manifest = { name: info.name, author: info.author, face, faces, animations: {} };
	const used = new Set();
	let missing = 0;

	for (const action of actions) {
		const frames = [];
		for (const frame of action.frames) {
			const sprite = spriteByKey.get(`${frame.group},${frame.image}`);
			const file = writeSprite(frame.group, frame.image);
			if (!sprite || !file) {
				missing++;
				continue; // Sprite not in this character's SFF — skip the frame.
			}
			frames.push({
				file,
				width: sprite.width,
				height: sprite.height,
				// Anchor = the sprite's axis (MUGEN origin near the feet) shifted by
				// the per-frame animation offset. Keeps the character planted across
				// differently sized frames and mirrors flips around the body.
				anchorX: sprite.x - frame.offsetX,
				anchorY: sprite.y - frame.offsetY,
				duration: Math.max(1, Math.round((frame.ticks / TICKS_PER_SECOND) * 1000))
			});
		}
		if (frames.length === 0) continue; // Nothing renderable — drop the action.

		manifest.animations[nameForAction(action.action, used)] = { loop: true, frames };
	}

	writeFileSync(join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

	const animCount = Object.keys(manifest.animations).length;
	const frameCount = Object.values(manifest.animations).reduce((n, a) => n + a.frames.length, 0);
	const spriteCount = spriteFiles.size;
	console.log(
		`${info.name} (${character.dir}): ${animCount} animations, ${frameCount} frames, ` +
			`${spriteCount} sprites${missing ? `, ${missing} frames skipped (missing sprite)` : ''} → ${outDir}`
	);

	return manifest;
}

/**
 * Resolve a character-src folder's sprite (.sff), animation (.air) and .def
 * inputs — the shape buildCharacter expects. Prefers the sprite/anim declared in
 * the .def's [Files] section (resolving case + subfolders), falling back to the
 * first .sff/.air in the folder. Returns null when any of the three is missing.
 */
function discoverInputs(dir) {
	const files = readdirSync(dir);
	const def = files.find((f) => f.toLowerCase().endsWith('.def'));
	let sff = null;
	let air = null;
	if (def) {
		const text = readFileSync(join(dir, def), 'utf-8');
		const ref = (key) => {
			const m = text.match(new RegExp(`^\\s*${key}\\s*=\\s*"?([^";\\r\\n]*)`, 'im'));
			return m ? resolveRelPath(dir, m[1].trim()) : null;
		};
		sff = ref('sprite');
		air = ref('anim');
	}
	sff = sff ?? files.find((f) => f.toLowerCase().endsWith('.sff')) ?? null;
	air = air ?? files.find((f) => f.toLowerCase().endsWith('.air')) ?? null;
	if (!def || !sff || !air) return null;
	return { sff, air, def };
}

/**
 * Re-decode characters-src/ into @3xl/assets frames + manifests. Optional CLI
 * args filter which folders to rebuild by id substring; no args rebuilds all.
 */
function main() {
	const filters = process.argv.slice(2).map((a) => a.toLowerCase());
	const ids = readdirSync(SRC_DIR, { withFileTypes: true })
		.filter((e) => e.isDirectory())
		.map((e) => e.name)
		.filter((id) => filters.length === 0 || filters.some((needle) => id.toLowerCase().includes(needle)))
		.sort();
	if (ids.length === 0) {
		console.error('No matching character folders in characters-src/.');
		process.exit(1);
	}
	for (const id of ids) {
		const inputs = discoverInputs(join(SRC_DIR, id));
		if (!inputs) {
			console.warn(`Skipping ${id}: could not resolve .def/.sff/.air inputs.`);
			continue;
		}
		buildCharacter({ dir: id, ...inputs });
	}
}

// Run only when invoked directly (`node generate-sprites.js`), not when
// import-mugen.js imports buildCharacter from here.
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
	main();
}

