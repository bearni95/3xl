/**
 * MUGEN sprite-decoding helpers, consumed by scripts/import-mugen.js (the
 * single entry point — `pnpm import:mugen`). Not a standalone script.
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
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
	const actPath = sffBuffer.readUInt8(15) === 1 ? findDefaultPalette(srcDir, defText) : null;
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

	// Portrait / face: prefer the larger versus portrait (9000,1), fall back to the
	// small select-screen portrait (9000,0). Null when the character ships neither.
	let face = null;
	for (const image of [1, 0]) {
		const sprite = spriteByKey.get(`9000,${image}`);
		const file = writeSprite(9000, image);
		if (!sprite || !file) continue;
		face = { file, width: sprite.width, height: sprite.height };
		break;
	}

	const manifest = { name: info.name, author: info.author, face, animations: {} };
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

