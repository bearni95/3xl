/**
 * Types for ./custom-faces.js. The MUGEN scripts are plain JS (they run under bare
 * `node`), but @3xl/backend imports this one under TypeScript, so it needs a
 * declaration to be reachable from there — same arrangement as ./frame-edits.d.ts.
 */

/** An image format an uploaded portrait may be in. */
export type CustomFaceFormat = 'png' | 'jpeg' | 'webp' | 'gif';

/** What an image file's own header declares. */
export interface ImageHeader {
	format: CustomFaceFormat;
	width: number;
	height: number;
}

/**
 * One uploaded portrait as the decoded manifest lists it — the same shape a
 * group-9000 sprite gets there, minus the `image` number it has no equivalent of,
 * plus the flag that says where it came from.
 */
export interface CustomFace {
	file: string;
	width: number;
	height: number;
	custom: true;
}

/** Uploaded portraits plus anything the caller should say out loud. */
export interface CustomFaces {
	faces: CustomFace[];
	warnings: string[];
}

/** What an uploaded portrait's filename looks like. */
export const CUSTOM_FACE_PATTERN: RegExp;

/** Where one character's uploaded portraits live. Throws on an id that isn't a folder name. */
export function customFacesDir(id: string): string;

/** The format and pixel size an image declares in its header, or null. */
export function readImageHeader(buffer: Buffer): ImageHeader | null;

/** Every filename in one character's upload folder, or none when it has none. */
export function customFaceFiles(id: string): string[];

/** A free filename for a newly uploaded portrait, under the extension its bytes call for. */
export function customFaceFile(
	label: string,
	format: CustomFaceFormat,
	existing?: string[]
): string;

/** Store one uploaded portrait; throws when the bytes are not a readable image. */
export function writeCustomFace(id: string, file: string, buffer: Buffer): CustomFace;

/** One character's uploaded portraits as manifest entries, in filename order. */
export function readCustomFaces(id: string): CustomFaces;

/** Copy one character's uploaded portraits into a frames folder, returning their entries. */
export function installCustomFaces(id: string, outDir: string): CustomFaces;
