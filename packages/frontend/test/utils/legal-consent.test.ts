import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { describe, expect, it } from 'vitest';
import {
	CONSENT_DOCUMENTS,
	LEGAL_DOCUMENTS,
	LEGAL_VERSIONS,
	LegalDocumentId,
	MINIMUM_AGE,
	consentIsCurrent,
	outstandingDocuments
} from '$types/legal.type';
import catalogue from '../../src/services/i18n/locales/ca.json';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, '../../../..');

describe('consentIsCurrent', () => {
	it('is false when nothing has been accepted', () => {
		expect(consentIsCurrent({})).toBe(false);
	});

	it('is true only when every consent document is at its current version', () => {
		const accepted = Object.fromEntries(CONSENT_DOCUMENTS.map((id) => [id, LEGAL_VERSIONS[id]]));
		expect(consentIsCurrent(accepted)).toBe(true);
	});

	it('a document rewritten since is a document nobody has accepted', () => {
		const accepted = Object.fromEntries(CONSENT_DOCUMENTS.map((id) => [id, LEGAL_VERSIONS[id]]));
		accepted[LegalDocumentId.Terms] = '1999-01-01';
		expect(consentIsCurrent(accepted)).toBe(false);
		expect(outstandingDocuments(accepted)).toEqual([LegalDocumentId.Terms]);
	});

	it('lists the outstanding documents in reading order', () => {
		expect(outstandingDocuments({})).toEqual([...CONSENT_DOCUMENTS]);
	});

	it('ignores documents nobody is asked to accept', () => {
		const accepted = Object.fromEntries(CONSENT_DOCUMENTS.map((id) => [id, LEGAL_VERSIONS[id]]));
		// The storage note is published and versioned, but never signed — being behind
		// on it must not put a player back through the gate.
		accepted[LegalDocumentId.Cookies] = '1999-01-01';
		expect(consentIsCurrent(accepted)).toBe(true);
	});
});

describe('the document set', () => {
	it('every document has a version', () => {
		for (const id of LEGAL_DOCUMENTS) {
			expect(LEGAL_VERSIONS[id]).toMatch(/^\d{4}-\d{2}-\d{2}$/);
		}
	});

	it('every document has Catalan text with headed sections', () => {
		const documents = (catalogue as Record<string, any>).legal.documents;
		for (const id of LEGAL_DOCUMENTS) {
			const doc = documents[id];
			expect(doc, `no catalogue entry for ${id}`).toBeTruthy();
			expect(doc.title.length).toBeGreaterThan(0);
			expect(doc.sections.length).toBeGreaterThan(0);
			for (const section of doc.sections) {
				expect(section.heading.length).toBeGreaterThan(0);
				expect(section.body.length).toBeGreaterThan(0);
			}
		}
	});

	it('asks for the strictest age any of the jurisdictions sets', () => {
		// 16 is the ceiling GDPR art. 8 allows a member state, and clears COPPA's 13.
		// Lowering it is a decision, not a tweak — this is here so it has to be one.
		expect(MINIMUM_AGE).toBe(16);
	});

	// The ledger's check constraint names the documents in SQL. A document added here
	// and not there would be one the RPC refuses to record, which is a gate nobody can
	// get through — so the two lists are held together by this test rather than by
	// somebody remembering.
	it('Postgres accepts exactly the documents this build publishes', () => {
		const sources = [
			readFileSync(join(repoRoot, 'packages/backend/supabase/legal_acceptances.sql'), 'utf-8'),
			readFileSync(join(repoRoot, 'packages/backend/src/routes/show-templates.ts'), 'utf-8')
		];
		for (const sql of sources) {
			const constraint = sql.match(
				/document\s+text\s+not\s+null\s+check\s*\(document in \(([^)]*)\)\)/
			);
			expect(constraint, 'no document check constraint found').toBeTruthy();
			const named = [...constraint![1].matchAll(/'([a-z]+)'/g)].map((match) => match[1]);
			expect(named.sort()).toEqual([...LEGAL_DOCUMENTS].sort());
		}
	});
});
