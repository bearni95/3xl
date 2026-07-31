import { describe, it, expect } from 'vitest';
import { profileAdapter, type SupabaseUserLike } from '$adapters/classes/profile.adapter';
import { OAuthProvider } from '$types/profile.type';

const user = (overrides: Partial<SupabaseUserLike> = {}): SupabaseUserLike => ({
	id: 'user-1',
	email: 'bernat@example.com',
	created_at: '2026-01-01T00:00:00Z',
	last_sign_in_at: '2026-07-01T00:00:00Z',
	...overrides
});

describe('profileAdapter.fromSupabaseUser', () => {
	it('leaves every fresh account nameless, whatever it signed in with', () => {
		for (const signedInWith of [['email'], ['google'], ['discord'], ['google', 'email']]) {
			const profile = profileAdapter.fromSupabaseUser(
				user({ identities: signedInWith.map((provider) => ({ provider })) })
			);
			expect(profile.username).toBeNull();
		}
	});

	// The name a provider hands over is the provider's, not the player's. It is not
	// merely ignored: the auth user is not read for a name at all.
	it('never takes a name from the auth user, however it is presented there', () => {
		const profile = profileAdapter.fromSupabaseUser(
			user({
				email: 'bernat@example.com',
				// Shapes Google/Discord and a crafted updateUser call would leave behind.
				user_metadata: { full_name: 'Bernat Canal', name: 'Bernat', username: 'sneaked' },
				identities: [{ provider: 'google' }]
			} as SupabaseUserLike)
		);
		expect(profile.username).toBeNull();
		// The address is still carried — it is account detail, labelled as such.
		expect(profile.email).toBe('bernat@example.com');
	});

	it('lists the linked social providers, dropping the email identity', () => {
		const profile = profileAdapter.fromSupabaseUser(
			user({
				identities: [{ provider: 'email' }, { provider: 'discord' }, { provider: 'discord' }]
			})
		);
		expect(profile.providers).toEqual([OAuthProvider.Discord]);
	});
});

describe('profileAdapter.withUsername', () => {
	const base = () => profileAdapter.fromSupabaseUser(user());

	it('wears the stored name', () => {
		expect(profileAdapter.withUsername(base(), 'player_one').username).toBe('player_one');
	});

	it('trims what it is given', () => {
		expect(profileAdapter.withUsername(base(), '  nakama  ').username).toBe('nakama');
	});

	it('reads a null, blank or whitespace name as nameless', () => {
		expect(profileAdapter.withUsername(base(), null).username).toBeNull();
		expect(profileAdapter.withUsername(base(), '').username).toBeNull();
		expect(profileAdapter.withUsername(base(), '   ').username).toBeNull();
	});

	it('clears a name that was set', () => {
		const named = profileAdapter.withUsername(base(), 'nakama');
		expect(profileAdapter.withUsername(named, null).username).toBeNull();
	});

	it('leaves the rest of the profile alone', () => {
		const before = profileAdapter.withExp(base(), 900);
		const after = profileAdapter.withUsername(before, 'nakama');
		expect(after.exp).toBe(before.exp);
		expect(after.level).toBe(before.level);
		expect(after.email).toBe(before.email);
	});
});
