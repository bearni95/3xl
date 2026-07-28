<script lang="ts">
	import classNames from 'classnames';
	import { createEventDispatcher } from 'svelte';
	import { _ } from 'svelte-i18n';
	import type { Profile } from '$types/profile.type';
	import { levelProgress } from '$utils/progression/level';

	// Props
	export let profile: Profile;
	export let signingOut: boolean = false;
	export let classes: string = '';
	// Compact drops the whole details list — account id, member since, total exp — and
	// the sign-out button, ending at the level bar. Used by the always-visible pinned
	// map panel, which is a glance card, not the account-management dropdown.
	export let compact: boolean = false;

	const dispatch = createEventDispatcher<{ signout: void; editusername: void }>();

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

	$: initial = (profile.displayName || profile.email || '?').charAt(0).toUpperCase();
	$: progress = levelProgress(profile.exp);
	$: expPercent = Math.round(progress.fraction * 100);
	$: memberDays = fullDaysSince(profile.createdAt);
</script>

<div class={classNames('flex flex-col gap-4', classes)}>
	<div class="flex items-center gap-4">
		<div class="avatar avatar-placeholder">
			<div class="w-14 rounded-full bg-primary text-primary-content">
				<span class="text-xl">{initial}</span>
			</div>
		</div>
		<!-- Beside the avatar: the name, and under it the level — which is what sits where
			the email used to. Progression is what a player reads their own card for; the
			address they signed in with is account admin, so it moves down to the
			dropdown's details list. flex-1 so the bar spans the rest of the row. -->
		<div class="flex min-w-0 flex-1 flex-col gap-1">
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
		compact is nothing but the avatar block. Its total-exp figure is already in the
		progress row above, so there is nothing left for compact to list. -->
	{#if !compact}
		<div class="divider my-0"></div>

		<dl class="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
			<dt class="text-base-content/60">{$_('profile.emailLabel')}</dt>
			<dd class="truncate">{profile.email}</dd>

			<dt class="text-base-content/60">{$_('profile.accountId')}</dt>
			<dd class="truncate font-mono">{profile.id}</dd>

			<dt class="text-base-content/60">{$_('profile.memberSince')}</dt>
			<dd>
				{#if memberDays === null}
					—
				{:else}
					{$_('profile.daysElapsed', { values: { days: memberDays } })}
				{/if}
			</dd>

			<dt class="text-base-content/60">{$_('profile.exp')}</dt>
			<dd class="font-mono">{progress.exp.toLocaleString()}</dd>
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
