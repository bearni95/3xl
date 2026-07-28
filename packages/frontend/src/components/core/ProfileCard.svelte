<script lang="ts">
	import classNames from 'classnames';
	import { createEventDispatcher } from 'svelte';
	import { _ } from 'svelte-i18n';
	import { OAUTH_PROVIDER_NAMES, type Profile } from '$types/profile.type';
	import { levelProgress } from '$utils/progression/level';
	import PlayerAvatar from '$components/core/PlayerAvatar.svelte';
	import ProviderIcon from '$components/core/ProviderIcon.svelte';

	// Props
	export let profile: Profile;
	export let signingOut: boolean = false;
	export let classes: string = '';
	// Compact drops the whole details list — email, member since, sign-in provider — and
	// the sign-out button, ending at the level bar. Used by the always-visible pinned
	// map panel, which is a glance card, not the account-management dropdown.
	export let compact: boolean = false;

	const dispatch = createEventDispatcher<{
		signout: void;
		editusername: void;
		openprofile: void;
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

	function handleOpenProfile(): void {
		dispatch('openprofile');
	}

	function handleEditAvatar(): void {
		dispatch('editavatar');
	}

	$: initial = (profile.displayName || profile.email || '?').charAt(0).toUpperCase();
	$: progress = levelProgress(profile.exp);
	$: expPercent = Math.round(progress.fraction * 100);
	$: memberDays = fullDaysSince(profile.createdAt);
</script>

<div class={classNames('flex flex-col gap-4', classes)}>
	<div class="flex items-center gap-4">
		<!-- The picture is the way into the avatar picker: clicking it raises the modal
			of every character portrait, and whichever is chosen is worn right here. -->
		<button
			type="button"
			class="flex-none rounded-full transition hover:ring-2 hover:ring-primary"
			title={$_('profile.avatar.edit')}
			aria-label={$_('profile.avatar.edit')}
			on:click={handleEditAvatar}
		>
			<PlayerAvatar characterId={profile.avatarCharacterId} {initial} />
		</button>
		<!-- Beside the avatar: the name, and under it the level — which is what sits where
			the email used to. Progression is what a player reads their own card for; the
			address they signed in with is account admin, so it moves down to the
			dropdown's details list. flex-1 so the bar spans the rest of the row. -->
		<div class="flex min-w-0 flex-1 flex-col gap-1">
			<div class="flex items-center gap-2">
				<span class="truncate text-lg font-semibold">{profile.displayName}</span>
				<!-- The button beside the name does whatever this card cannot: compact holds
					nothing but the avatar block, so it opens the full card (the one the navbar
					drops down, details list and sign-out included) — which is where the username
					is then edited, since the full card carries that button itself. -->
				{#if compact}
					<!-- Primary, and pushed to the far end of the row by the name's slack: it is
						the one thing there is to do from the glance card, so it reads as the card's
						action rather than as an afterthought hanging off the name. -->
					<button
						type="button"
						class="btn btn-primary btn-xs ml-auto flex-none"
						on:click={handleOpenProfile}
					>
						{$_('profile.title')}
					</button>
				{:else}
					<button type="button" class="btn btn-ghost btn-xs" on:click={handleEditUsername}>
						{profile.username ? $_('profile.username.edit') : $_('profile.username.set')}
					</button>
				{/if}
			</div>

			<!-- Level + experience, derived from the stored exp via the D&D 5e table.
				"Lv. 10" as plain text: it needs no badge and no word beside it, since the
				bar underneath already says this is the level. -->
			<div class="flex items-center justify-between gap-2 text-sm">
				<span class="font-semibold">
					{$_('profile.levelBadge', { values: { level: progress.level } })}
				</span>
				<span class="font-mono text-base-content/70">
					{#if progress.atMax}
						{$_('profile.expMax', { values: { exp: progress.exp.toLocaleString() } })}
					{:else}
						{$_('profile.expProgress', {
							values: {
								into: progress.expIntoLevel.toLocaleString(),
								span: (progress.expForLevelSpan ?? 0).toLocaleString()
							}
						})}
					{/if}
				</span>
			</div>
			<progress
				class="progress progress-primary w-full"
				value={expPercent}
				max="100"
				aria-label={$_('profile.exp')}
			></progress>
		</div>
	</div>

	<!-- The details list, and the divider that introduces it, are the dropdown's alone:
		compact is nothing but the avatar block. Everything listed here is account admin
		— which address, since when, through whom — not the progression a glance card is
		read for. -->
	{#if !compact}
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
	{/if}

	{#if !compact}
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
	{/if}
</div>
