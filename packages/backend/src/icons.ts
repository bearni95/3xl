import { readdir, access } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { NON_GAME_ICON_FOLDERS } from '@3xl/shared/types/achievement.type';

/**
 * The vendored glyph set on disk, as the two screens that pick from it see it.
 *
 * Both the achievement editor and the `/shows` screen offer the author a glyph out
 * of @3xl/assets' `public/icons/`, and both save one into the git tree, so the
 * listing and the validation have to be the same reading of the same directory — a
 * picker that offers what the save refuses is a picker that lies. That is why this
 * is one module and not a copy in each route.
 *
 * The two differ in exactly one thing: the `shows` folder. Those are Noun Project
 * glyphs that each stand for a particular show, so offering one for a *badge* would
 * put a show's mark on an achievement — but they are the obvious pick for a show,
 * being the marks the game has always badged its shows with. So a caller says which
 * set it means, and nothing else about the two is different.
 */

// packages/backend/src → packages/assets. Resolved from this file's location so the
// process cwd doesn't matter.
const ICONS_DIR = fileURLToPath(new URL('../../assets/public/icons', import.meta.url));

/** `<folder>/<slug>`, both lowercase — a path into ICONS_DIR and not one out of it. */
const ICON_PATTERN = /^[a-z0-9-]+\/[a-z0-9-]+$/;

/** Whether a folder is offerable to a caller that did (not) ask for the show set. */
function offerable(folder: string, showFolder: boolean): boolean {
	return showFolder || !NON_GAME_ICON_FOLDERS.includes(folder);
}

/**
 * Every glyph in @3xl/assets, as `<folder>/<slug>`, sorted. With `showFolder` the
 * per-show Noun Project marks are included; without it, only the game-icons.net set.
 * An unreadable icons dir yields an empty list rather than throwing: the picker then
 * offers nothing, which is honest, and the save refuses everything for the same
 * reason.
 */
export async function listIcons(showFolder: boolean): Promise<string[]> {
	const names: string[] = [];
	let folders: string[];
	try {
		folders = (await readdir(ICONS_DIR, { withFileTypes: true }))
			.filter((entry) => entry.isDirectory() && offerable(entry.name, showFolder))
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
 * Whether `<folder>/<slug>` names a glyph that is actually on disk and offerable to
 * this caller — the same question {@link listIcons} answers in bulk, asked of one
 * name at save time.
 */
export async function iconExists(icon: string, showFolder: boolean): Promise<boolean> {
	// The pattern already bars dots and extra separators, so this cannot escape
	// ICONS_DIR; the folder check is what keeps the two sets apart.
	if (!ICON_PATTERN.test(icon)) return false;
	const [folder, slug] = icon.split('/');
	if (!offerable(folder, showFolder)) return false;
	try {
		await access(resolve(ICONS_DIR, folder, `${slug}.svg`));
		return true;
	} catch {
		return false;
	}
}
