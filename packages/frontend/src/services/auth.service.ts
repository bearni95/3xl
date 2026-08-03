import { writable, type Readable } from 'svelte/store';
import { browser } from '$app/environment';
import { profileAdapter } from '$adapters/classes/profile.adapter';
import {
	AuthStatus,
	type CredentialRejection,
	type OAuthProvider,
	type Profile
} from '$types/profile.type';
import type { SpawnColor } from '$types/character-spawn.type';
import type { CombatReport, CombatReward } from '$types/combat.type';
import { MIN_LEVEL } from '$utils/progression/level';
import { getSupabaseClient, isSupabaseConfigured } from '$services/supabase.client';

/** Why `set_player_username` turned a name down, in terms a screen can word. */
export type UsernameRejection = 'taken' | 'invalid';

/**
 * A username the server refused. Carries the reason rather than the server's
 * sentence so the modal can say it in the player's own language.
 */
export class UsernameRejected extends Error {
	constructor(
		readonly reason: UsernameRejection,
		message: string
	) {
		super(message);
		this.name = 'UsernameRejected';
	}
}

/**
 * Read a Postgres error from `set_player_username` as a rejection reason. The RPC
 * raises with the SQLSTATE that says which: `23505` (unique_violation) for a name
 * someone else holds, `22023` (invalid_parameter_value) for one that breaks the
 * length or character rules. Anything else is a real failure and passes through.
 */
function usernameError(error: { code?: string; message?: string }): Error {
	const message = error.message ?? 'Failed to set username';
	if (error.code === '23505') return new UsernameRejected('taken', message);
	if (error.code === '22023') return new UsernameRejected('invalid', message);
	return new Error(message);
}

/**
 * Credentials Supabase refused. Carries the reason rather than the server's own
 * sentence, which arrives in English and says more about the account than the
 * person typing is owed — see {@link credentialError}.
 */
export class CredentialsRejected extends Error {
	constructor(
		readonly reason: CredentialRejection,
		message: string
	) {
		super(message);
		this.name = 'CredentialsRejected';
	}
}

/**
 * Read a Supabase auth error as a rejection reason.
 *
 * Keyed on `code`, which is the stable part of an `AuthError` — the message is
 * English prose that changes between releases. Anything unrecognised passes through
 * as a plain Error, so a failure this does not know about is still reported rather
 * than dressed up as a wrong password.
 *
 * "No such account" and "wrong password" are deliberately one reason: Supabase
 * answers both with `invalid_credentials` precisely so that a form cannot be used to
 * find out who has an account here, and taking them apart on screen would undo that.
 */
function credentialError(error: { code?: string; status?: number; message?: string }): Error {
	const message = error.message ?? 'Authentication failed';
	switch (error.code) {
		case 'invalid_credentials':
			return new CredentialsRejected('invalid', message);
		case 'email_not_confirmed':
			return new CredentialsRejected('unconfirmed', message);
		case 'weak_password':
		case 'validation_failed':
			return new CredentialsRejected('weak', message);
		case 'email_address_invalid':
			return new CredentialsRejected('email', message);
		case 'over_email_send_rate_limit':
		case 'over_request_rate_limit':
			return new CredentialsRejected('rate', message);
		case 'signup_disabled':
		case 'email_provider_disabled':
			return new CredentialsRejected('closed', message);
		default:
			// Older gateways answer a throttle with the status alone.
			if (error.status === 429) return new CredentialsRejected('rate', message);
			return new Error(message);
	}
}

/**
 * Client-side authentication state for the SPA, backed by Supabase auth — an email
 * address with a password, or Google. Supabase owns session persistence in
 * localStorage; this service mirrors it into Svelte stores and exposes intent methods.
 */
class AuthService {
	private statusStore = writable<AuthStatus>(AuthStatus.Loading);
	private profileStore = writable<Profile | null>(null);
	private loadedStore = writable(false);
	private initialised = false;

	/** Current lifecycle state (loading / signed-out / signed-in). */
	get status(): Readable<AuthStatus> {
		return this.statusStore;
	}

	/** The signed-in account, or `null` when signed out. */
	get profile(): Readable<Profile | null> {
		return this.profileStore;
	}

	/**
	 * Whether the `player_profiles` row behind the current session has been fetched
	 * — the username, the experience and the avatar all come from it, so until this
	 * is true the profile on screen reads as nameless at exp 0 simply because
	 * nothing has arrived yet. Anything that acts on the *absence* of a username
	 * (the first-sign-in prompt) has to wait for it, or it fires at every visitor.
	 */
	get loaded(): Readable<boolean> {
		return this.loadedStore;
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
			this.loadedStore.set(false);
			this.profileStore.set(profileAdapter.fromSupabaseUser(user));
			this.statusStore.set(AuthStatus.SignedIn);
			// The username, the experience and the chosen avatar all live in a separate
			// table; fetch them and fold them in. Fire and forget — the profile renders
			// immediately, nameless and at exp 0 on the letter avatar, and updates on load.
			void this.loadPlayerProfile();
		} else {
			this.profileStore.set(null);
			this.statusStore.set(AuthStatus.SignedOut);
			this.loadedStore.set(false);
		}
	}

	/**
	 * Load the signed-in player's `player_profiles` row from Supabase — the username
	 * they chose, their experience total and their avatar character — and merge it
	 * into the profile store (recomputing the level). A player with no row yet reads
	 * as nameless at 0 exp with no avatar; the row is created lazily the first time
	 * they name themselves, gain experience or pick a portrait. No-ops when signed
	 * out or Supabase is unconfigured; failures are swallowed so a missing table
	 * never breaks sign-in.
	 *
	 * This is the one place a username is read, and the column is the one place it is
	 * stored — a name on screen is therefore always a name this player typed.
	 */
	private async loadPlayerProfile(): Promise<void> {
		if (!isSupabaseConfigured()) return;
		try {
			const supabase = getSupabaseClient();
			const { data, error } = await supabase
				.from('player_profiles')
				.select('username, exp, avatar_character_id, avatar_color')
				.maybeSingle();
			if (error) throw error;
			this.mergeUsername((data?.username as string | null) ?? null);
			this.mergeExp(Number(data?.exp ?? 0));
			this.mergeAvatar(
				(data?.avatar_character_id as string | null) ?? null,
				(data?.avatar_color as SpawnColor | null) ?? null
			);
		} catch (error) {
			console.warn('Failed to load player profile', error);
		} finally {
			// Loaded either way: a failed read is as settled as an empty one, and the
			// prompt that waits on this must not hang on a missing table.
			this.loadedStore.set(true);
		}
	}

	/**
	 * Re-read the stored row, for a caller that has just had the server change it
	 * behind this store's back — a fight awards experience through an RPC of its own
	 * (see `award_combat_exp`), and the profile card's level and bar are read off this
	 * profile. One extra read rather than a total handed back from
	 * elsewhere: the row is the truth, and it is one query.
	 */
	async refreshProfile(): Promise<void> {
		await this.loadPlayerProfile();
	}

	/** Overlay the stored username onto the current profile. */
	private mergeUsername(username: string | null): void {
		this.profileStore.update((profile) =>
			profile ? profileAdapter.withUsername(profile, username) : profile
		);
	}

	/** Overlay an experience total onto the current profile, recomputing its level. */
	private mergeExp(exp: number): void {
		this.profileStore.update((profile) =>
			profile ? profileAdapter.withExp(profile, exp) : profile
		);
	}

	/** Overlay the worn avatar — both halves of it — onto the current profile. */
	private mergeAvatar(characterId: string | null, color: SpawnColor | null): void {
		this.profileStore.update((profile) =>
			profile ? profileAdapter.withAvatar(profile, characterId, color) : profile
		);
	}

	/**
	 * Wear the avatar showing `characterId` in `color` (nulls clear it back to the
	 * initial-letter avatar). Both halves travel together because an avatar is the
	 * pair, not the character.
	 *
	 * Goes through the `set_player_avatar` RPC rather than a table write:
	 * `player_profiles` takes no client writes at all, so the same row's experience
	 * stays out of the browser's reach. The RPC is also what decides whether the
	 * player may wear it — the pair has to be one they actually hold in
	 * `player_avatars`, which only a booster box can put there. Throws on failure so
	 * the caller can report it; the store is only updated once Supabase has stored
	 * the choice.
	 */
	async setAvatar(characterId: string | null, color: SpawnColor | null): Promise<void> {
		if (!isSupabaseConfigured()) return;
		const supabase = getSupabaseClient();
		const { error } = await supabase.rpc('set_player_avatar', {
			p_character_id: characterId,
			p_color: color
		});
		if (error) throw error;
		this.mergeAvatar(characterId, color);
	}

	/**
	 * Report a finished fight and collect whatever experience it earned — the only
	 * way a player gains experience.
	 *
	 * The browser states *what happened* (the outcome, which of its fighters were left
	 * standing, and how many rivals it felled), never how much that is worth: the
	 * `award_combat_exp` RPC checks every fighter belongs to the caller, counts the
	 * survivors itself, bounds the rival count against the line-up it froze on the
	 * battle, and computes the award from the player's stored experience — a win pays
	 * out the player's current level's whole span scaled by the share of the team still
	 * up, a loss ten for each rival it took down with it, a draw nothing. The
	 * authoritative new total (and the level it implies) is mirrored into the profile
	 * store. Returns `null` when signed out / unconfigured.
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
			})),
			// What a loss is paid for. The server caps it at the rival line-up it is
			// holding, so this is a count being reported and not an amount being claimed.
			p_rivals_defeated: Math.max(0, Math.trunc(report.rivalsDefeated) || 0)
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
			// The count as the server bounded it, not as this tab reported it. (Its OUT
			// name avoids the column the RPC writes it to, as the rest of them do.)
			rivalsDefeated: Number(row.rivals_felled ?? 0),
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
	 * Sign in with an address and a password.
	 *
	 * The session lands in this tab — there is no round trip and no consent screen —
	 * so the `onAuthStateChange` subscription in {@link init} picks it up before this
	 * resolves, and everything hanging off a session (the profile row, the acceptance
	 * ledger) settles on its own. Throws {@link CredentialsRejected} so the form can
	 * say which of the handful of answers it got.
	 */
	async signInWithPassword(email: string, password: string): Promise<void> {
		const supabase = getSupabaseClient();
		const { error } = await supabase.auth.signInWithPassword({
			email: email.trim(),
			password
		});
		if (error) throw credentialError(error);
	}

	/**
	 * Open an account on an address and a password.
	 *
	 * Returns whether the address still has to be confirmed — `true` when Supabase
	 * took the sign-up but handed back no session, which is what a project with email
	 * confirmation on does (this one; see `mailer_autoconfirm`). The caller has a
	 * player who is *not* signed in and must be told to go and read their mail.
	 *
	 * An address that already has an account comes back the same way, with no error
	 * and no session, and this cannot tell the two apart — deliberately, on Supabase's
	 * part: the difference is exactly what a form must not be able to reveal about
	 * somebody else's address. So the caller's message has to be true of both, and the
	 * existing account's owner gets a mail they can ignore rather than a stranger
	 * learning they are here.
	 *
	 * The password is *not* pre-checked here — {@link MIN_PASSWORD_LENGTH} is the
	 * form's business, since the form is where a rule can be said before it is broken.
	 * Anything Supabase itself refuses arrives as {@link CredentialsRejected}.
	 */
	async signUpWithPassword(email: string, password: string): Promise<boolean> {
		const supabase = getSupabaseClient();
		const { data, error } = await supabase.auth.signUp({
			email: email.trim(),
			password,
			options: {
				// Where the link in the mail comes back to. Same origin the player is
				// standing on, so a confirmation opened from a phone lands on the game
				// rather than on whatever the project's Site URL was set to years ago.
				emailRedirectTo: browser ? `${window.location.origin}/` : undefined
			}
		});
		if (error) throw credentialError(error);
		return !data.session;
	}

	/**
	 * Set, change, or clear the signed-in account's username — the only way one is
	 * ever written.
	 *
	 * It goes through the `set_player_username` RPC rather than a table write or a
	 * `updateUser` call on the auth user's metadata. Two reasons, both structural.
	 * A username has to be **unique**, and uniqueness cannot be established by a
	 * client that (under RLS) can only see its own row. And auth metadata is exactly
	 * where a name nobody typed would come from: Google and Discord write their
	 * `full_name` there on every sign-in, and any holder of the anon key can write
	 * it themselves. The RPC validates the name, enforces the uniqueness, and stores
	 * it in the single column that the app reads back.
	 *
	 * Blank (or whitespace) clears it back to nameless, which is a perfectly good
	 * state for an account to sit in. Throws {@link UsernameRejected} when the name
	 * is taken or malformed, so the caller can say which.
	 */
	async updateUsername(username: string): Promise<void> {
		const trimmed = username.trim();
		const supabase = getSupabaseClient();
		const { data, error } = await supabase.rpc('set_player_username', {
			p_username: trimmed || null
		});
		if (error) throw usernameError(error);
		this.mergeUsername((data as string | null) ?? null);
	}

	/**
	 * Everything the game holds about the signed-in player, as one JSON document —
	 * the right of access and the right to portability answered together (GDPR
	 * arts. 15 and 20, and the "right to know" every US state privacy law has a
	 * version of).
	 *
	 * It goes through the `export_player_data` RPC rather than a dozen selects from
	 * here, and not for convenience: several of those tables are unreadable under RLS
	 * or only reachable through a view, and the account's own identity — the address
	 * it signs in with, when it was created — lives in `auth.users`, which no client
	 * role may read at all. A right of access has to answer for the *whole* of what
	 * is held, and what is held is a fact about the schema.
	 *
	 * Returns `null` when signed out or unconfigured; throws when the read fails, so
	 * the sheet can say the download did not happen rather than hand over a file that
	 * is missing half the answer.
	 */
	async exportAccountData(): Promise<unknown | null> {
		if (!isSupabaseConfigured()) return null;
		const supabase = getSupabaseClient();
		const { data, error } = await supabase.rpc('export_player_data');
		if (error) throw error;
		return data ?? null;
	}

	/**
	 * Erase the account and everything hanging off it — GDPR art. 17, and the
	 * deletion right of the US state laws.
	 *
	 * The `delete_player_account` RPC takes no argument: it deletes the caller and
	 * only the caller, and the cascade from `auth.users` takes the profile, the
	 * cards, the avatars, the badges, the fights, the boosters, the open battle, the
	 * towns held and the acceptance ledger with it. It is a real delete rather than a
	 * flag — nothing here is under a retention duty, because nothing is ever paid for
	 * — so there is nothing left to restore afterwards and nothing to warn about
	 * except that.
	 *
	 * The session is ended locally straight after: the account it authenticated is
	 * gone, and a browser still holding its token would spend the next minute getting
	 * errors from every read on the page.
	 */
	async deleteAccount(): Promise<void> {
		const supabase = getSupabaseClient();
		const { error } = await supabase.rpc('delete_player_account');
		if (error) throw error;
		await supabase.auth.signOut();
	}

	/** End the current session. */
	async signOut(): Promise<void> {
		const supabase = getSupabaseClient();
		const { error } = await supabase.auth.signOut();
		if (error) throw error;
	}
}

export const authService = new AuthService();
