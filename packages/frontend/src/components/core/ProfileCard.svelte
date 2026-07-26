<script lang="ts">
	import classNames from 'classnames';
	import { createEventDispatcher } from 'svelte';
	import { _ } from 'svelte-i18n';
	import type { Profile } from '$types/profile.type';

	// Props
	export let profile: Profile;
	export let signingOut: boolean = false;
	export let classes: string = '';

	const dispatch = createEventDispatcher<{ signout: void; editusername: void }>();

	function formatDate(value: string | null): string {
		if (!value) return '—';
		const date = new Date(value);
		return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString();
	}

	function handleSignOut(): void {
		if (!signingOut) dispatch('signout');
	}

	function handleEditUsername(): void {
		dispatch('editusername');
	}

	$: initial = (profile.displayName || profile.email || '?').charAt(0).toUpperCase();
</script>

<div class={classNames('flex flex-col gap-4', classes)}>
	<div class="flex items-center gap-4">
		<div class="avatar avatar-placeholder">
			<div class="w-14 rounded-full bg-primary text-primary-content">
				<span class="text-xl">{initial}</span>
			</div>
		</div>
		<div class="flex min-w-0 flex-col">
			<div class="flex items-center gap-2">
				<span class="truncate text-lg font-semibold">{profile.displayName}</span>
				<button
					type="button"
					class="btn btn-ghost btn-xs"
					on:click={handleEditUsername}
				>
					{profile.username ? $_('profile.username.edit') : $_('profile.username.set')}
				</button>
			</div>
			<span class="truncate text-sm text-base-content/70">{profile.email}</span>
		</div>
	</div>

	<div class="divider my-0"></div>

	<dl class="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
		<dt class="text-base-content/60">{$_('profile.accountId')}</dt>
		<dd class="truncate font-mono">{profile.id}</dd>

		<dt class="text-base-content/60">{$_('profile.memberSince')}</dt>
		<dd>{formatDate(profile.createdAt)}</dd>

		<dt class="text-base-content/60">{$_('profile.lastSignIn')}</dt>
		<dd>{formatDate(profile.lastSignInAt)}</dd>
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
