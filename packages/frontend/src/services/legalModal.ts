import { writable } from 'svelte/store';
import { LegalDocumentId } from '$types/legal.type';

/**
 * Which legal document is up on the full-view sheet, or `null` when none is.
 *
 * It carries the document rather than a boolean because every way in names one: the
 * menu opens on the terms, "read the privacy policy" beside the sign-in checkbox
 * opens on the privacy notice, and the sheet's own tabs move between them. A store
 * that only said "open" would have made the caller set a second one to say which,
 * and the two could disagree.
 *
 * It lives out here, as the other modal stores do, because the sheet is mounted at
 * the layout root: raised from inside the map's pinned panel or from the menu it
 * would be trapped in their stacking context, and this sheet in particular has to be
 * reachable from the sign-in — which is inside both.
 */
export const legalModalDocument = writable<LegalDocumentId | null>(null);

/** Raise the sheet on `document`. */
export function openLegalDocument(document: LegalDocumentId): void {
	legalModalDocument.set(document);
}

/** Put the sheet away. */
export function closeLegalDocument(): void {
	legalModalDocument.set(null);
}
