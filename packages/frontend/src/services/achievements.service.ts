import { getSupabaseClient } from '$services/supabase.client';
import { achievementAdapter } from '$adapters/classes/achievement.adapter';
import { DAILY_ACHIEVEMENT_COUNT } from '$utils/achievement/daily';
import type {
	Achievement,
	AchievementAward,
	AchievementAwardRow,
	AchievementClaim,
	AchievementClaimRow,
	AchievementsCollection
} from '$types/achievement.type';

/**
 * The game's achievements, read the way they are stored — in two halves.
 *
 * Supabase's `achievement_templates` says which badges the game *has*: an id, and
 * the badge's requirement compiled into a form the database can evaluate. What each
 * badge *says* — its glyph, its name, the line saying what earns it, and the
 * formulas its wording quotes — lives only in the authored
 * `public/achievements.json`, served here at `/data/achievements.json`. So the list
 * comes from the database and every word on screen comes from the file, and
 * rewording a badge is one edit in the git tree that no row anywhere can disagree
 * with.
 *
 * A row whose id the file has nothing for is dropped: that is the `orphan` state the
 * admin's sync screen names — a badge retired locally but still up there, possibly
 * still worn — and there is no glyph and no wording to draw it with.
 *
 * Awarding is not here. A badge is granted by the `claim_achievements` RPC, which
 * recomputes which badges are today's, walks each requirement itself against rows
 * the browser cannot write, and decides the experience — see
 * {@link claimAchievements} and packages/backend/supabase/achievement_templates.sql.
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

/** Everything one opening of the achievements modal needs. */
export interface AchievementsSnapshot {
	/** Every badge Supabase holds, resolved against the file, in row order. */
	achievements: Achievement[];
	/**
	 * Every badge Supabase holds, as ids — the pool a player's day is drawn from. Read
	 * from the database rather than from the file so the browser draws from exactly the
	 * pool `daily_achievement_ids` draws from: a badge authored locally but not synced is
	 * not in the game yet, and one synced but retired locally still is.
	 *
	 * Every badge, not only the ones with a rule. A badge with no rule is still set and
	 * still shown; it simply cannot be completed until somebody writes it one, which is
	 * the claim's business rather than the draw's.
	 */
	pool: string[];
	/**
	 * What this player has completed, newest first, as `player_achievements` records
	 * it: the badge, the moment it landed and the experience it paid. Empty for a
	 * visitor who is not signed in.
	 */
	awards: AchievementAward[];
	/** The same thing as a set of ids, which is all a tile needs to know. */
	held: Set<string>;
	/**
	 * How many badges a day the game sets, read from `achievement_settings` — the same
	 * row `daily_achievement_count()` reads inside `claim_achievements`. It is a setting
	 * rather than a constant so it can be moved without a deploy, and it is read here
	 * rather than assumed so the browser draws the pick that can actually be claimed.
	 */
	dailyCount: number;
}

/**
 * The badges, the pool they are drawn from and what this player has completed — one
 * trip for all of it, since a modal that showed the list before it knew what was held
 * would have to redraw itself.
 */
export async function loadAchievements(userId: string | null): Promise<AchievementsSnapshot> {
	const supabase = getSupabaseClient();
	const [templates, authored, awards, settings] = await Promise.all([
		supabase.from('achievement_templates').select('id, requirement'),
		loadCollection(),
		userId
			? supabase
					.from('player_achievements')
					.select('achievement_id, awarded_at, exp_awarded')
					.eq('user_id', userId)
					.order('awarded_at', { ascending: false })
			: Promise.resolve({ data: [], error: null }),
		supabase.from('achievement_settings').select('daily_count').maybeSingle()
	]);
	if (templates.error) throw templates.error;
	if (awards.error) throw awards.error;
	// A missing settings row is not a failure: the constant is what the table would
	// have been provisioned with, so the draw carries on with it.
	const dailyCount = Number(
		(settings.data as { daily_count?: number } | null)?.daily_count ?? DAILY_ACHIEVEMENT_COUNT
	);

	const byId = new Map(authored.achievements.map((achievement) => [achievement.id, achievement]));
	const achievements: Achievement[] = [];
	const pool: string[] = [];
	for (const row of templates.data ?? []) {
		const id = String(row.id);
		// In the pool whether or not the file can draw it: a row the file has nothing for
		// is still one the RPC would pick, so leaving it out here would have the two sides
		// pick different sets.
		pool.push(id);
		const achievement = byId.get(id);
		if (achievement) achievements.push(achievement);
	}

	// The table is world-readable (a badge is worn), so the `user_id` filter is what
	// makes this the caller's own list rather than everybody's.
	const completed = achievementAdapter.fromAwardRows(awards.data as AchievementAwardRow[] | null);
	return {
		achievements,
		pool,
		awards: completed,
		held: new Set(completed.map((award) => award.achievementId)),
		dailyCount
	};
}

/**
 * Claim today's badges: the player says they have done them, and the server decides.
 *
 * It takes no arguments, and that is the whole point — which badges are today's,
 * whether each has been earned and what each pays are all recomputed inside the
 * RPC, against rows the anon key cannot write. Returns a row per badge set today,
 * so the caller can say which were paid out, which were already held and which are
 * not there yet. Claiming twice pays once.
 */
export async function claimAchievements(): Promise<AchievementClaim[]> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase.rpc('claim_achievements');
	if (error) throw error;
	return achievementAdapter.fromClaimRows(data as AchievementClaimRow[] | null);
}
