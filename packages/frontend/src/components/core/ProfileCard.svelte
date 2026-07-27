<script lang="ts">
	import classNames from 'classnames';
	import { createEventDispatcher } from 'svelte';
	import { _ } from 'svelte-i18n';
	import type { Profile } from '$types/profile.type';
	import type { BoostersStatus } from '$services/spawn.service';
	import { levelProgress } from '$utils/progression/level';

	// Props
	export let profile: Profile;
	export let signingOut: boolean = false;
	export let classes: string = '';
	// Compact drops the account-id / member-since rows and the sign-out button —
	// used by the always-visible pinned map panel, which is a glance card, not the
	// account-management dropdown.
	export let compact: boolean = false;
	// The player's daily booster allowance, shown as a "N / M left" glance row when
	// provided (the pinned map panel loads it). Null hides the row entirely.
	export let boosters: BoostersStatus | null = null;

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

	<!-- Level + experience, derived from the stored exp via the D&D 5e table. -->
	<div class="flex flex-col gap-1">
		<div class="flex items-center justify-between text-sm">
			<span class="flex items-center gap-2">
				<span class="badge badge-primary badge-sm font-semibold">
					{$_('profile.levelBadge', { values: { level: progress.level } })}
				</span>
				<span class="text-base-content/60">{$_('profile.level')}</span>
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

	{#if boosters}
		<div class="flex items-center justify-between text-sm">
			<span class="text-base-content/60">{$_('profile.claimsToday')}</span>
			<span
				class={classNames('font-mono font-semibold tabular-nums', {
					'text-warning': boosters.remaining === 0
				})}
			>
				{$_('profile.claimsRemaining', {
					values: { remaining: boosters.remaining, level: boosters.level }
				})}
			</span>
		</div>
	{/if}

	<div class="divider my-0"></div>

	<dl class="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
		{#if !compact}
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
		{/if}

		<dt class="text-base-content/60">{$_('profile.exp')}</dt>
		<dd class="font-mono">{progress.exp.toLocaleString()}</dd>
	</dl>

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
