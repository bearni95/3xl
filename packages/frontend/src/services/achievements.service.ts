import { getSupabaseClient } from '$services/supabase.client';
import type { Achievement, AchievementsCollection } from '$types/achievement.type';

/**
 * The game's achievements, read the way they are stored — in two halves.
 *
 * Supabase's `achievement_templates` says which badges the game *has*: a row is
 * an id and nothing else, synced up from the local collection by the admin. What
 * each badge is — its glyph, its name, the line saying what earns it, and the
 * formulas its wording quotes — lives only in the authored
 * `public/achievements.json`, served here at `/data/achievements.json`. So the
 * list comes from the database and every word on screen comes from the file, and
 * rewording a badge is one edit in the git tree that no row anywhere can
 * disagree with.
 *
 * A row whose id the file has nothing for is dropped: that is the `orphan` state
 * the admin's sync screen names — a badge retired locally but still up there,
 * possibly still worn — and there is no glyph and no wording to draw it with.
 */

/** The authored collection, fetched once per session and shared. */
let collection: Promise<AchievementsCollection> | null = null;

function loadCollection(): Promise<AchievementsCollection> {
	collection ??= fetch('/data/achievements.json')
		.then((response) => {
			if (!response.ok) throw new Error(`Failed to load achievements (${response.status})`);
			return response.json() as Promise<AchievementsCollection>;
		})
		.catch((error) => {
			// Cleared on failure, so re-opening the modal tries again rather than the
			// whole session going badge-less over one dropped request.
			collection = null;
			throw error;
		});
	return collection;
}

/**
 * Every badge Supabase holds, in the order it returns them, resolved against the
 * authored file. Both halves are fetched together — the file is cached, the table
 * is not: a badge synced up while the player was on the page should be here the
 * next time they open the modal.
 */
export async function loadAchievements(): Promise<Achievement[]> {
	const supabase = getSupabaseClient();
	const [rows, authored] = await Promise.all([
		supabase.from('achievement_templates').select('id'),
		loadCollection()
	]);
	if (rows.error) throw rows.error;

	const byId = new Map(authored.achievements.map((achievement) => [achievement.id, achievement]));
	const achievements: Achievement[] = [];
	for (const row of rows.data ?? []) {
		const achievement = byId.get(String(row.id));
		if (achievement) achievements.push(achievement);
	}
	return achievements;
}
