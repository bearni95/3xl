import { readdir, access } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * The vendored glyph set on disk, as the `/shows` screen that picks from it sees it.
 *
 * That screen offers the author a glyph out of @3xl/assets' `public/icons/` and saves
 * one into the git tree, so the listing and the validation have to be the same reading
 * of the same directory — a picker that offers what the save refuses is a picker that
 * lies. That is why this is one module and not a copy in the route.
 */

// packages/backend/src → packages/assets. Resolved from this file's location so the
// process cwd doesn't matter.
const ICONS_DIR = fileURLToPath(new URL('../../assets/public/icons', import.meta.url));

/** `<folder>/<slug>`, both lowercase — a path into ICONS_DIR and not one out of it. */
const ICON_PATTERN = /^[a-z0-9-]+\/[a-z0-9-]+$/;

/**
 * Every glyph in @3xl/assets, as `<folder>/<slug>`, sorted — the game-icons.net set
 * and the per-show Noun Project marks alike. An unreadable icons dir yields an empty
 * list rather than throwing: the picker then offers nothing, which is honest, and the
 * save refuses everything for the same reason.
 */
export async function listIcons(): Promise<string[]> {
	const names: string[] = [];
	let folders: string[];
	try {
		folders = (await readdir(ICONS_DIR, { withFileTypes: true }))
			.filter((entry) => entry.isDirectory())
			.map((entry) => entry.name);
	} catch {
		return names;
	}
	for (const folder of folders) {
		const files = await readdir(resolve(ICONS_DIR, folder));
		for (const file of files) {
			if (file.endsWith('.svg')) names.push(`${folder}/${file.slice(0, -4)}`);
		}
	}
	return names.sort();
}

/**
 * Whether `<folder>/<slug>` names a glyph that is actually on disk — the same
 * question {@link listIcons} answers in bulk, asked of one name at save time.
 */
export async function iconExists(icon: string): Promise<boolean> {
	// The pattern already bars dots and extra separators, so this cannot escape
	// ICONS_DIR.
	if (!ICON_PATTERN.test(icon)) return false;
	const [folder, slug] = icon.split('/');
	try {
		await access(resolve(ICONS_DIR, folder, `${slug}.svg`));
		return true;
	} catch {
		return false;
	}
}
