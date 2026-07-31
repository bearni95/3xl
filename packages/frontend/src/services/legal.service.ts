import { derived, get, writable, type Readable } from 'svelte/store';
import { browser } from '$app/environment';
import {
	CONSENT_DOCUMENTS,
	LEGAL_VERSIONS,
	LegalDocumentId,
	outstandingDocuments,
	type LegalAcceptance,
	type PendingLegalConsent
} from '$types/legal.type';
import { authService } from '$services/auth.service';
import { getSupabaseClient, isSupabaseConfigured } from '$services/supabase.client';

/** Where an acceptance made before there was an account waits out the round trip. */
const PENDING_KEY = 'legal-consent-pending';

/**
 * What each player has accepted, and the awkward fact that they accept it before
 * they exist.
 *
 * Signing in leaves the page for Google's consent screen and comes back with a
 * session, so the boxes at the gate are ticked by somebody the game has no id for.
 * There is nowhere to record it at the moment it happens. So it is **held** in the
 * browser across the round trip (`legal-consent-pending`) and **flushed** to the
 * server the instant a session lands — which is the first moment there is an account
 * for the record to be about. If the player abandons the consent screen, the held
 * acceptance simply sits there unused and is overwritten the next time they tick the
 * boxes; nothing was recorded about a person who never arrived.
 *
 * The server-side ledger is the record (`legal_acceptances`, see the backend's
 * supabase/legal_acceptances.sql). This store is a mirror of it, and the thing that
 * mirror is *for* is the second question: not "did they accept" but "did they accept
 * **this** version". A document that has been rewritten since is a document nobody
 * has agreed to, so the same store that lets the gate stand aside for a returning
 * player is what puts them back through it when the terms move (see
 * {@link outstanding}).
 *
 * Nothing here decides anything the server does not also decide: the RPC stamps its
 * own timestamp and writes the caller's own id, and this store cannot pre-date or
 * forge either. What it can do — and all it does — is know when to ask.
 */
class LegalService {
	private acceptedStore = writable<Partial<Record<LegalDocumentId, string>>>({});
	private loadedStore = writable(false);
	private initialised = false;

	/** The version accepted per document, as the ledger has it. */
	get accepted(): Readable<Partial<Record<LegalDocumentId, string>>> {
		return this.acceptedStore;
	}

	/**
	 * Whether the ledger has been read for the current session.
	 *
	 * Everything that acts on the *absence* of an acceptance has to wait for this,
	 * or it fires at every player in the half-second before their record arrives —
	 * which would mean showing the "the terms have changed" gate to people who
	 * accepted them a moment ago.
	 */
	get loaded(): Readable<boolean> {
		return this.loadedStore;
	}

	/**
	 * The consent documents the signed-in player has not accepted at their current
	 * version, in reading order — empty while signed out, and empty until the ledger
	 * has actually been read.
	 */
	get outstanding(): Readable<LegalDocumentId[]> {
		return derived([this.acceptedStore, this.loadedStore], ([accepted, loaded]) =>
			loaded ? outstandingDocuments(accepted) : []
		);
	}

	/**
	 * Mirror the ledger for whoever is signed in, and flush anything held from
	 * before they were. Safe to call repeatedly; only the first call subscribes.
	 * No-ops on the server.
	 */
	init(): void {
		if (this.initialised || !browser) return;
		this.initialised = true;

		authService.profile.subscribe((profile) => {
			if (!profile) {
				this.acceptedStore.set({});
				this.loadedStore.set(false);
				return;
			}
			void this.settle();
		});
	}

	/**
	 * Hold an acceptance in the browser while the player is away at the provider's
	 * consent screen. Called immediately before the redirect, because after it this
	 * tab is gone.
	 */
	hold(consent: PendingLegalConsent): void {
		if (!browser) return;
		try {
			localStorage.setItem(PENDING_KEY, JSON.stringify(consent));
		} catch {
			// A browser refusing storage is not a reason to refuse the sign-in: the
			// flush below will find nothing, and the gate will ask again on arrival
			// — which is a worse first minute, not a broken one.
		}
	}

	/** Whatever is held, or `null`. */
	private takeHeld(): PendingLegalConsent | null {
		if (!browser) return null;
		try {
			const raw = localStorage.getItem(PENDING_KEY);
			if (!raw) return null;
			localStorage.removeItem(PENDING_KEY);
			const parsed = JSON.parse(raw) as PendingLegalConsent;
			return parsed && typeof parsed === 'object' && parsed.versions ? parsed : null;
		} catch {
			return null;
		}
	}

	/**
	 * Record acceptance of `documents` at their current versions, optionally with the
	 * age attestation, and fold the result back into the store. The versions are read
	 * from {@link LEGAL_VERSIONS} here rather than taken from a caller: what a player
	 * accepted is the text that was on screen, and the text on screen is whatever the
	 * app is built with.
	 *
	 * Throws on failure so the gate can say the acceptance did not land — an
	 * acceptance the server never got is one that will be asked for again, and
	 * pretending otherwise is the one thing this must not do.
	 */
	async accept(documents: readonly LegalDocumentId[], ageConfirmed = false): Promise<void> {
		if (!isSupabaseConfigured() || documents.length === 0) return;
		const versions = Object.fromEntries(documents.map((id) => [id, LEGAL_VERSIONS[id]]));
		const supabase = getSupabaseClient();
		const { data, error } = await supabase.rpc('record_legal_acceptance', {
			p_documents: versions,
			p_age_confirmed: ageConfirmed
		});
		if (error) throw error;
		this.applyRows(data as LegalAcceptanceRow[] | null);
	}

	/** Flush anything held from before sign-in, then read the ledger back. */
	private async settle(): Promise<void> {
		if (!isSupabaseConfigured()) {
			// Nowhere to record and nowhere to read: treat the session as settled so
			// nothing waits forever on a ledger that cannot exist. An unconfigured
			// build has no accounts either, so there is nobody to gate.
			this.loadedStore.set(true);
			return;
		}
		const held = this.takeHeld();
		if (held) {
			const documents = CONSENT_DOCUMENTS.filter((id) => held.versions[id] === LEGAL_VERSIONS[id]);
			try {
				await this.accept(documents, held.ageConfirmed);
			} catch (error) {
				// The gate will ask again on this very page, which is the recovery.
				console.warn('Failed to record the acceptance made at sign-in', error);
			}
		}
		await this.load();
	}

	/** Read the caller's acceptance ledger and mirror the latest version per document. */
	private async load(): Promise<void> {
		try {
			const supabase = getSupabaseClient();
			const { data, error } = await supabase
				.from('legal_acceptances')
				.select('document, version, accepted_at')
				.order('accepted_at', { ascending: true });
			if (error) throw error;
			this.acceptedStore.set({});
			this.applyRows(data as LegalAcceptanceRow[] | null);
		} catch (error) {
			console.warn('Failed to read the acceptance ledger', error);
		} finally {
			// Settled either way: a failed read is as settled as an empty one. It does
			// mean an outage puts players through the gate again, which is the safe
			// direction to fail in — asking twice is a nuisance, and running on an
			// acceptance nobody can produce is the thing that is not allowed.
			this.loadedStore.set(true);
		}
	}

	/** Fold ledger rows into the store, latest acceptance per document winning. */
	private applyRows(rows: LegalAcceptanceRow[] | null): void {
		if (!rows?.length) return;
		this.acceptedStore.update((accepted) => {
			const next = { ...accepted };
			for (const row of rows) {
				const id = row.document as LegalDocumentId;
				if (!(id in LEGAL_VERSIONS)) continue;
				next[id] = row.version;
			}
			return next;
		});
	}

	/** The acceptances on record, newest first — what the settings sheet lists. */
	async history(): Promise<LegalAcceptance[]> {
		if (!isSupabaseConfigured()) return [];
		const supabase = getSupabaseClient();
		const { data, error } = await supabase
			.from('legal_acceptances')
			.select('document, version, accepted_at')
			.order('accepted_at', { ascending: false });
		if (error) throw error;
		return ((data as LegalAcceptanceRow[] | null) ?? []).map((row) => ({
			document: row.document as LegalDocumentId,
			version: row.version,
			acceptedAt: row.accepted_at
		}));
	}

	/** Whether `document` is accepted at the version this build ships. */
	isCurrent(document: LegalDocumentId): boolean {
		return get(this.acceptedStore)[document] === LEGAL_VERSIONS[document];
	}
}

/** One row of `legal_acceptances` as PostgREST returns it. */
interface LegalAcceptanceRow {
	document: string;
	version: string;
	accepted_at: string;
}

export const legalService = new LegalService();
