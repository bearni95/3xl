import { describe, expect, it } from 'vitest';
import { CREDENTIAL_REJECTIONS, MIN_PASSWORD_LENGTH } from '$types/profile.type';
import catalogue from '../../src/services/i18n/locales/ca.json';

// The sign-in form words a refusal by looking the reason up in the catalogue
// (`profile.password.rejected.<reason>`), so a reason with no message is a player who
// failed to get in and was shown a key. The two lists have to agree, and only a test can
// hold them to it — nothing at run time would notice.

const password = (catalogue as Record<string, any>).profile.password as Record<string, unknown>;
const rejected = password.rejected as Record<string, string>;

describe('the refusals the sign-in form has to word', () => {
	it('has a Catalan message for every reason the service can raise', () => {
		for (const reason of CREDENTIAL_REJECTIONS) {
			expect(rejected[reason], `missing profile.password.rejected.${reason}`).toBeTruthy();
		}
	});

	it('has no message for a reason nothing can raise', () => {
		expect(Object.keys(rejected).sort()).toEqual([...CREDENTIAL_REJECTIONS].sort());
	});

	it('states the password rule with the length the form enforces', () => {
		expect(password.minimum).toContain('{length}');
		expect(MIN_PASSWORD_LENGTH).toBeGreaterThanOrEqual(8);
	});
});
