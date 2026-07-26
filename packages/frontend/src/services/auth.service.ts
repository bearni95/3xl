import { writable, type Readable } from 'svelte/store';
import { browser } from '$app/environment';
import { profileAdapter } from '$adapters/classes/profile.adapter';
import { AuthStatus, type Profile } from '$types/profile.type';
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
		} else {
			this.profileStore.set(null);
			this.statusStore.set(AuthStatus.SignedOut);
		}
	}

	/**
	 * Send a passwordless magic link to `email`. Creates the account if it does
	 * not exist yet, so this covers both sign-in and registration.
	 */
	async sendMagicLink(email: string): Promise<void> {
		const supabase = getSupabaseClient();
		const { error } = await supabase.auth.signInWithOtp({
			email,
			options: {
				shouldCreateUser: true,
				emailRedirectTo: browser ? `${window.location.origin}/` : undefined
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
