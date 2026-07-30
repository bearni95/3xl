import { writable, type Readable } from 'svelte/store';
import { browser } from '$app/environment';
import { profileAdapter } from '$adapters/classes/profile.adapter';
import { AuthStatus, type OAuthProvider, type Profile } from '$types/profile.type';
import type { CombatReport, CombatReward } from '$types/combat.type';
import { MIN_LEVEL } from '$utils/progression/level';
import { getSupabaseClient, isSupabaseConfigured } from '$services/supabase.client';

/**
 * Client-side authentication state for the SPA, backed by Supabase magic-link
 * (passwordless) auth. Supabase owns session persistence in localStorage; this
 * service mirrors it into Svelte stores and exposes intent methods.
 */
class AuthService {
	private statusStore = writable<AuthStatus>(AuthStatus.Loading);
	private profileStore = writable<Profile | null>(null);
	private initialised = false;

	/** Current lifecycle state (loading / signed-out / signed-in). */
	get status(): Readable<AuthStatus> {
		return this.statusStore;
	}

	/** The signed-in account, or `null` when signed out. */
	get profile(): Readable<Profile | null> {
		return this.profileStore;
	}

	/** Whether Supabase credentials are present in the environment. */
	get configured(): boolean {
		return isSupabaseConfigured();
	}

	/**
	 * Restore any existing session and subscribe to auth changes. Safe to call
	 * repeatedly; only the first call wires things up. No-ops on the server and
	 * when Supabase is not configured.
	 */
	init(): void {
		if (this.initialised || !browser) return;
		this.initialised = true;

		if (!isSupabaseConfigured()) {
			this.statusStore.set(AuthStatus.SignedOut);
			return;
		}

		const supabase = getSupabaseClient();

		supabase.auth.getSession().then(({ data }) => this.apply(data.session?.user ?? null));
		supabase.auth.onAuthStateChange((_event, session) => this.apply(session?.user ?? null));
	}

	/** Push a Supabase user (or its absence) into the stores. */
	private apply(user: Parameters<typeof profileAdapter.fromSupabaseUser>[0] | null): void {
		if (user) {
			this.profileStore.set(profileAdapter.fromSupabaseUser(user));
			this.statusStore.set(AuthStatus.SignedIn);
			// Experience and the chosen avatar live in a separate table; fetch them and
			// fold them in. Fire and forget — the profile renders immediately at exp 0
			// on the letter avatar, and updates on load.
			void this.loadPlayerProfile();
		} else {
			this.profileStore.set(null);
			this.statusStore.set(AuthStatus.SignedOut);
		}
	}

	/**
	 * Load the signed-in player's `player_profiles` row from Supabase — their
	 * experience total and their chosen avatar character — and merge it into the
	 * profile store (recomputing the level). A player with no row yet reads as 0
	 * exp and no avatar; the row is created lazily on their first exp gain or
	 * avatar pick. No-ops when signed out or Supabase is unconfigured; failures are
	 * swallowed so a missing table never breaks sign-in.
	 */
	private async loadPlayerProfile(): Promise<void> {
		if (!isSupabaseConfigured()) return;
		try {
			const supabase = getSupabaseClient();
			const { data, error } = await supabase
				.from('player_profiles')
				.select('exp, avatar_character_id')
				.maybeSingle();
			if (error) throw error;
			this.mergeExp(Number(data?.exp ?? 0));
			this.mergeAvatar((data?.avatar_character_id as string | null) ?? null);
		} catch (error) {
			console.warn('Failed to load player profile', error);
		}
	}

	/**
	 * Re-read the stored row, for a caller that has just had the server change it
	 * behind this store's back — claiming an achievement awards experience through an
	 * RPC of its own (see achievements.service), and the profile card's level and bar
	 * are read off this profile. One extra read rather than a total handed back from
	 * elsewhere: the row is the truth, and it is one query.
	 */
	async refreshProfile(): Promise<void> {
		await this.loadPlayerProfile();
	}

	/** Overlay an experience total onto the current profile, recomputing its level. */
	private mergeExp(exp: number): void {
		this.profileStore.update((profile) =>
			profile ? profileAdapter.withExp(profile, exp) : profile
		);
	}

	/** Overlay the chosen avatar character onto the current profile. */
	private mergeAvatar(characterId: string | null): void {
		this.profileStore.update((profile) =>
			profile ? profileAdapter.withAvatar(profile, characterId) : profile
		);
	}

	/**
	 * Wear `characterId`'s portrait as the profile picture (null clears it back to
	 * the initial-letter avatar). Goes through the `set_player_avatar` RPC rather
	 * than a table write: `player_profiles` takes no client writes at all, so the
	 * same row's experience stays out of the browser's reach. The RPC also rejects
	 * ids that name no character template. Throws on failure so the caller can
	 * report it; the store is only updated once Supabase has stored the choice.
	 */
	async setAvatar(characterId: string | null): Promise<void> {
		if (!isSupabaseConfigured()) return;
		const supabase = getSupabaseClient();
		const { error } = await supabase.rpc('set_player_avatar', {
			p_character_id: characterId
		});
		if (error) throw error;
		this.mergeAvatar(characterId);
	}

	/**
	 * Report a finished fight and collect whatever experience it earned — the only
	 * way a player gains experience.
	 *
	 * The browser states *what happened* (the outcome, and which of its fighters were
	 * left standing), never how much that is worth: the `award_combat_exp` RPC checks
	 * every fighter belongs to the caller, counts the survivors itself, and computes
	 * the award from the player's stored experience — a win pays out the player's
	 * current level's whole span scaled by the share of the team still up, a loss or
	 * draw pays nothing. The authoritative new total (and the level it implies) is
	 * mirrored into the profile store. Returns `null` when signed out / unconfigured.
	 *
	 * Which town the fight was over, and which generation of its team was beaten, are
	 * *not* sent: they are read off the player's open battle, which the server opened
	 * and has held since (see `battle.service`). The same RPC settles the territory in
	 * the same transaction — a win banks a siege win, enough of them flip the town —
	 * and closes the battle, freeing the player to start another. What it all did comes
	 * back on {@link CombatReward.territory}, again decided server-side.
	 *
	 * Throws when there is no open battle to report against: the fight on screen was
	 * never one the server knew about.
	 */
	async reportCombat(report: CombatReport): Promise<CombatReward | null> {
		if (!isSupabaseConfigured() || report.fighters.length === 0) return null;
		const supabase = getSupabaseClient();
		const { data, error } = await supabase.rpc('award_combat_exp', {
			p_outcome: report.outcome,
			p_fighters: report.fighters.map((fighter) => ({
				spawn_id: fighter.spawnId,
				down: fighter.down
			}))
		});
		if (error) throw error;

		const row = Array.isArray(data) ? data[0] : data;
		if (!row) return null;
		const reward: CombatReward = {
			awarded: Number(row.awarded_exp ?? 0),
			total: Number(row.total_exp ?? 0),
			level: Number(row.at_level ?? MIN_LEVEL),
			span: Number(row.span_exp ?? 0),
			survivors: Number(row.team_survivors ?? 0),
			fielded: Number(row.team_fielded ?? 0),
			// Which town this was, and what the fight did to it, both as the server has
			// them — the report itself no longer names a town.
			territory:
				row.town_id && row.town_required != null
					? {
							locationId: String(row.town_id),
							captured: Boolean(row.town_captured),
							wins: Number(row.town_wins ?? 0),
							required: Number(row.town_required ?? 1),
							turnover: Number(row.town_turnover ?? 0),
							stale: Boolean(row.town_stale)
						}
					: null
		};
		this.mergeExp(reward.total);
		return reward;
	}

	/**
	 * Hand the browser over to `provider`'s consent screen (Google) and come back
	 * to the app with a session. This covers both sign-in and registration:
	 * Supabase creates the account on first use, and an account that already
	 * exists under the same verified email is linked to rather than duplicated.
	 *
	 * The call navigates away, so it only resolves on failure — everything after
	 * it happens on the return trip, where `detectSessionInUrl` completes the
	 * exchange and the `onAuthStateChange` subscription in {@link init} picks the
	 * session up.
	 */
	async signInWithProvider(provider: OAuthProvider): Promise<void> {
		const supabase = getSupabaseClient();
		const { error } = await supabase.auth.signInWithOAuth({
			provider,
			options: {
				redirectTo: browser ? `${window.location.origin}/` : undefined
			}
		});
		if (error) throw error;
	}

	/**
	 * Set (or change) the signed-in account's username. Persists it to Supabase
	 * user metadata and immediately mirrors the updated user into the stores.
	 */
	async updateUsername(username: string): Promise<void> {
		const trimmed = username.trim();
		const supabase = getSupabaseClient();
		const { data, error } = await supabase.auth.updateUser({
			data: { full_name: trimmed, name: trimmed }
		});
		if (error) throw error;
		this.apply(data.user ?? null);
	}

	/** End the current session. */
	async signOut(): Promise<void> {
		const supabase = getSupabaseClient();
		const { error } = await supabase.auth.signOut();
		if (error) throw error;
	}
}

export const authService = new AuthService();
