<script lang="ts">
	import classNames from 'classnames';
	import { createEventDispatcher } from 'svelte';
	import { _ } from 'svelte-i18n';
	import { OAUTH_PROVIDER_NAMES, type Profile } from '$types/profile.type';
	import PlayerAvatar from '$components/core/PlayerAvatar.svelte';
	import ProviderIcon from '$components/core/ProviderIcon.svelte';

	// The account card — the navbar dropdown and the settings modal. The map panel no
	// longer shows a cut-down version of this: the player is a row of its own there now
	// (see ProfileTile), so there is one shape of this card left. What that row reads out
	// is what this card does not carry: the level and the experience bar are progression,
	// and this card is the account rather than what it has earned.

	// Props
	export let profile: Profile;
	export let signingOut: boolean = false;
	export let classes: string = '';

	const dispatch = createEventDispatcher<{
		signout: void;
		editusername: void;
		editavatar: void;
	}>();

	/** Whole days elapsed since `value`, or `null` when it's missing/invalid. */
	function fullDaysSince(value: string | null): number | null {
		if (!value) return null;
		const then = new Date(value).getTime();
		if (Number.isNaN(then)) return null;
		return Math.max(0, Math.floor((Date.now() - then) / 86_400_000));
	}

	function handleSignOut(): void {
		if (!signingOut) dispatch('signout');
	}

	function handleEditUsername(): void {
		dispatch('editusername');
	}

	function handleEditAvatar(): void {
		dispatch('editavatar');
	}

	// The letter avatar stands on the chosen name and nothing else: an account that
	// has not been named shows a question mark rather than the first letter of the
	// address it signed in with.
	$: initial = (profile.username || '?').charAt(0).toUpperCase();
	// What to call a nameless account on screen. Wording, not data: nothing is
	// stored, and the field behind it stays empty until the player fills it.
	$: shownName = profile.username || $_('profile.username.none');
	$: memberDays = fullDaysSince(profile.createdAt);
</script>

<div class={classNames('flex flex-col gap-4', classes)}>
	<div class="flex items-center gap-4">
		<!-- The picture is the way into the avatar picker: clicking it raises the modal
			of every character portrait, and whichever is chosen is worn right here. -->
		<button
			type="button"
			class="flex-none rounded-md transition hover:ring-2 hover:ring-primary"
			title={$_('profile.avatar.edit')}
			aria-label={$_('profile.avatar.edit')}
			on:click={handleEditAvatar}
		>
			<PlayerAvatar characterId={profile.avatarCharacterId} {initial} />
		</button>
		<!-- Beside the avatar: the name. Nothing about the account's progress is on this
			card — the level and the experience bar are read off the player's row in the map
			panel (see ProfileTile), and this card is opened to change the account rather
			than to admire it, so a second copy of those numbers here only said them twice.
			flex-1 so whatever stands here spans the rest of the row.

			The name is a slot: a host that lets the player type it fills this with the field
			itself, which is one name on the card and the one being edited (the settings
			sheet does exactly that). Left alone it reads the stored name out, with a button
			that asks for the sheet where it can be changed. -->
		<div class="flex min-w-0 flex-1 flex-col gap-1">
			<slot name="name">
				<div class="flex items-center gap-2">
					<span
						class={classNames('truncate text-lg font-semibold', {
							'text-base-content/50 italic': !profile.username
						})}>{shownName}</span
					>
					<button type="button" class="btn btn-ghost btn-xs" on:click={handleEditUsername}>
						{profile.username ? $_('profile.username.edit') : $_('profile.username.set')}
					</button>
				</div>
			</slot>
		</div>
	</div>

	<!-- The details list, under a divider that introduces it. Everything listed here is
		account admin — which address, since when, through whom — not the progression the
		block above it is read for, and none of it is on the panel's tile. -->
	<div class="divider my-0"></div>

	<dl class="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
		<dt class="text-base-content/60">{$_('profile.emailLabel')}</dt>
		<dd class="truncate">{profile.email}</dd>

		<dt class="text-base-content/60">{$_('profile.memberSince')}</dt>
		<dd>
			{#if memberDays === null}
				—
			{:else}
				{$_('profile.daysElapsed', { values: { days: memberDays } })}
			{/if}
		</dd>

		<!-- Only accounts that signed in through a provider have this row: an
			email-link account has nothing to name here, and an empty "—" would only
			ask the reader to work out what it means. -->
		{#if profile.providers.length}
			<dt class="text-base-content/60">{$_('profile.signedInWith')}</dt>
			<dd class="flex flex-wrap items-center gap-x-3 gap-y-1">
				{#each profile.providers as provider (provider)}
					<span class="flex items-center gap-1.5">
						<ProviderIcon {provider} classes="h-4 w-4" />
						{OAUTH_PROVIDER_NAMES[provider]}
					</span>
				{/each}
			</dd>
		{/if}
	</dl>

	<button
		type="button"
		disabled={signingOut}
		class={classNames('btn btn-outline btn-error', { 'btn-disabled': signingOut })}
		on:click={handleSignOut}
	>
		{#if signingOut}
			<span class="loading loading-spinner loading-sm"></span>
		{/if}
		{$_('profile.signOut')}
	</button>
</div>
