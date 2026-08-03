/**
 * The portraits the author uploaded, kept where a re-decode cannot reach them.
 *
 * A character's faces come out of MUGEN sprite group 9000, decoded into
 * @3xl/assets public/<id>/frames/ and listed in that folder's manifest.json. Both
 * are generated: every `pnpm import:mugen` — additive mode included — and every
 * `pnpm generate:sprites` deletes the frames folder and rewrites the manifest whole
 * from the raw .sff/.air. So a portrait uploaded into that folder would be deleted
 * on the next import, and one added to that manifest would be forgotten, for exactly
 * the reason a hand-deleted frame used to come back: it would be an edit to generated
 * data.
 *
 * An upload is therefore stored here instead — one folder per character,
 * `faces/` beside the `definition.json` it belongs with in @3xl/data's
 * public/characters/<id>/, the folder an additive import keeps as-is — and copied
 * onto every fresh decode, with an entry appended to the manifest's `faces` list.
 * The frames folder stays generated; what the author put in it is authored. (A wipe
 * run deletes that folder, uploaded portraits along with the hand-tuned definition,
 * which is what a wipe is for.)
 *
 * Downstream, a copied-in portrait is a face like any other: it sits in the frames
 * folder under the character's `basePath`, the manifest describes its pixel size, and
 * `definition.face` names it by bare filename — so the crop editor, the avatar picker,
 * the account card and the board all read it through the paths they already had. The
 * `custom_` prefix is what tells the two apart (a decoded sprite is always
 * `spr_<group>_<image>.png`), which is what lets a re-copy replace the whole uploaded
 * set without touching the decoded one.
 *
 * Both packages that touch the store live off this module: @3xl/mugen copies it in
 * after a decode, @3xl/backend writes to it when the admin's Faces screen uploads an
 * image. Plain JS with no dependencies, like ./registry.js and ./frame-edits.js and
 * for the same reason — the backend imports it under TypeScript (see
 * ./custom-faces.d.ts).
 *
 * A portrait's pixel size is read off the file's own header rather than recorded
 * beside it: the folder is then the whole record, with nothing that can drift from
 * what is actually on disk. PNG, JPEG, WebP and GIF are understood; anything else is
 * refused at upload, so nothing unmeasurable reaches the folder.
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @3xl/data's per-character folder — definition.json's own neighbours. */
const DEFINITIONS_DIR = join(__dirname, '../data/public/characters');

/** The extension an uploaded portrait is stored under, per format understood. */
const EXTENSION_BY_FORMAT = { png: 'png', jpeg: 'jpg', webp: 'webp', gif: 'gif' };

/**
 * What an uploaded portrait's filename looks like. The `custom_` prefix keeps it
 * clear of every decoded sprite (`spr_<group>_<image>.png`), and the rest is
 * slug-safe, so a name that reaches here can be joined onto a path and written into
 * a definition as-is.
 */
export const CUSTOM_FACE_PATTERN = /^custom_[a-z0-9-]+\.(?:png|jpg|webp|gif)$/;

/**
 * Where one character's uploaded portraits live. Ids are folder names, so anything
 * that could climb out of DEFINITIONS_DIR is refused (@3xl/backend holds request ids
 * to a stricter pattern of its own before it ever gets here).
 */
export function customFacesDir(id) {
	if (!id || /[\\/]/.test(id) || id === '.' || id === '..') {
		throw new Error(`Invalid character id: ${id}`);
	}
	return join(DEFINITIONS_DIR, id, 'faces');
}

// ---------------------------------------------------------------------------
// Image headers
// ---------------------------------------------------------------------------

/**
 * The format and pixel size an image file declares in its own header, or null when
 * the bytes are not one of the four formats understood. Only the header is read —
 * nothing here decodes an image, because the only thing a portrait's pixels are
 * needed for downstream is the coordinate space its crop is authored in.
 */
export function readImageHeader(buffer) {
	if (!buffer || buffer.length < 24) return null;
	// PNG: the IHDR chunk leads the file, so its dimensions sit at a fixed offset.
	if (buffer.readUInt32BE(0) === 0x89504e47 && buffer.readUInt32BE(4) === 0x0d0a1a0a) {
		return { format: 'png', width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
	}
	// GIF: the logical screen descriptor follows the 6-byte header, little-endian.
	if (buffer.toString('ascii', 0, 3) === 'GIF') {
		return { format: 'gif', width: buffer.readUInt16LE(6), height: buffer.readUInt16LE(8) };
	}
	if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
		return webpHeader(buffer);
	}
	if (buffer.readUInt16BE(0) === 0xffd8) return jpegHeader(buffer);
	return null;
}

/** WebP dimensions, which sit in a different place in each of its three chunk kinds. */
function webpHeader(buffer) {
	const chunk = buffer.toString('ascii', 12, 16);
	// Lossy: 14-bit dimensions in the VP8 keyframe header, after its start code.
	if (chunk === 'VP8 ' && buffer.length >= 30) {
		return {
			format: 'webp',
			width: buffer.readUInt16LE(26) & 0x3fff,
			height: buffer.readUInt16LE(28) & 0x3fff
		};
	}
	// Lossless: 14 bits each, packed into the four bytes after the signature byte,
	// and stored one short of the real size.
	if (chunk === 'VP8L' && buffer.length >= 25) {
		const bits = buffer.readUInt32LE(21);
		return { format: 'webp', width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 };
	}
	// Extended: 24-bit dimensions, also one short, in the VP8X chunk.
	if (chunk === 'VP8X' && buffer.length >= 30) {
		return {
			format: 'webp',
			width: buffer.readUIntLE(24, 3) + 1,
			height: buffer.readUIntLE(27, 3) + 1
		};
	}
	return null;
}

/**
 * JPEG dimensions, which are in the frame header (SOFn) rather than at a fixed
 * offset: every other segment declares its own length and is stepped over. C4, C8
 * and CC fall in the SOF marker range without being frame headers.
 */
function jpegHeader(buffer) {
	let offset = 2;
	while (offset + 9 < buffer.length) {
		if (buffer[offset] !== 0xff) {
			offset++; // Fill byte or padding — resync on the next marker.
			continue;
		}
		const marker = buffer[offset + 1];
		if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
			return {
				format: 'jpeg',
				width: buffer.readUInt16BE(offset + 7),
				height: buffer.readUInt16BE(offset + 5)
			};
		}
		// Standalone markers (padding, restarts, start/end of image) carry no length.
		if (marker === 0xff || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd9)) {
			offset += 2;
			continue;
		}
		offset += 2 + buffer.readUInt16BE(offset + 2);
	}
	return null;
}

// ---------------------------------------------------------------------------
// The store
// ---------------------------------------------------------------------------

/** Every filename in one character's upload folder, or none when it has none. */
export function customFaceFiles(id) {
	const dir = customFacesDir(id);
	return existsSync(dir) ? readdirSync(dir).sort() : [];
}

/**
 * A filename for a newly uploaded portrait: the name it arrived under, slugged, under
 * the extension its own bytes call for (not the one it was named with) and suffixed
 * until it is free of `existing`. A portrait uploaded twice therefore lands beside the
 * first rather than replacing it — the author picks which one the board wears, and
 * silently overwriting a file the definition may still name is not this function's
 * call to make.
 */
export function customFaceFile(label, format, existing = []) {
	const extension = EXTENSION_BY_FORMAT[format];
	if (!extension) throw new Error(`Unsupported image format: ${format}`);
	const slug = String(label ?? '')
		.replace(/\.[^.]+$/, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
	const base = slug || 'face';
	const taken = new Set(existing);
	let file = `custom_${base}.${extension}`;
	for (let n = 2; taken.has(file); n++) file = `custom_${base}-${n}.${extension}`;
	return file;
}

/**
 * Store one uploaded portrait, returning its manifest entry. The bytes are measured
 * again here rather than trusted: what the folder holds has to be readable by the
 * decode that copies it out, and a file nothing can size would be a face with no
 * coordinate space for its crop.
 */
export function writeCustomFace(id, file, buffer) {
	if (!CUSTOM_FACE_PATTERN.test(file)) throw new Error(`Invalid portrait filename: ${file}`);
	const header = readImageHeader(buffer);
	if (!header || !(header.width > 0) || !(header.height > 0)) {
		throw new Error('Not a PNG, JPEG, WebP or GIF image');
	}
	const dir = customFacesDir(id);
	mkdirSync(dir, { recursive: true });
	writeFileSync(join(dir, file), buffer);
	return { file, width: header.width, height: header.height, custom: true };
}

/**
 * One character's uploaded portraits as manifest entries, in filename order, plus
 * anything the caller should say out loud. A file the folder holds that this cannot
 * read is skipped with a warning rather than throwing: the rest of the character
 * still decodes, and the author is told which file to look at.
 */
export function readCustomFaces(id) {
	const dir = customFacesDir(id);
	const faces = [];
	const warnings = [];
	for (const file of customFaceFiles(id)) {
		if (!CUSTOM_FACE_PATTERN.test(file)) {
			warnings.push(`faces/${file} is not a portrait filename — ignored`);
			continue;
		}
		const header = readImageHeader(readFileSync(join(dir, file)));
		if (!header || !(header.width > 0) || !(header.height > 0)) {
			warnings.push(`faces/${file} could not be measured — ignored`);
			continue;
		}
		faces.push({ file, width: header.width, height: header.height, custom: true });
	}
	return { faces, warnings };
}

/**
 * Copy one character's uploaded portraits into a freshly decoded frames folder and
 * hand back their manifest entries, for the caller to append to the `faces` list.
 * Run after every decode, and again after an upload, so the folder and the store say
 * the same thing either way round.
 */
export function installCustomFaces(id, outDir) {
	const { faces, warnings } = readCustomFaces(id);
	if (faces.length > 0) mkdirSync(outDir, { recursive: true });
	const dir = customFacesDir(id);
	for (const face of faces) copyFileSync(join(dir, face.file), join(outDir, face.file));
	return { faces, warnings };
}
