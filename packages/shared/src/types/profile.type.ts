import type { ID } from './core.type';

/** Authentication lifecycle state for the current visitor. */
export enum AuthStatus {
	/** Still restoring the session from storage / resolving the magic link. */
	Loading = 'loading',
	/** No active session — the visitor is a guest. */
	SignedOut = 'signed-out',
	/** An active session exists. */
	SignedIn = 'signed-in'
}

/** Normalised view model of the signed-in account, decoupled from Supabase. */
export interface Profile {
	id: ID;
	email: string;
	/** Display name from user metadata, falling back to the email local-part. */
	displayName: string;
	/** ISO timestamp the account was created, if known. */
	createdAt: string | null;
	/** ISO timestamp of the most recent sign-in, if known. */
	lastSignInAt: string | null;
}
