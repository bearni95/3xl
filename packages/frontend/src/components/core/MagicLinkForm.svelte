<script lang="ts">
	import classNames from 'classnames';
	import { createEventDispatcher } from 'svelte';
	import { _ } from 'svelte-i18n';

	// Props
	export let loading: boolean = false;
	export let disabled: boolean = false;
	export let classes: string = '';

	const dispatch = createEventDispatcher<{ submit: { email: string } }>();

	let email: string = '';

	// Basic shape check; Supabase performs the authoritative validation.
	$: isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
	$: canSubmit = isValidEmail && !loading && !disabled;

	function handleSubmit(): void {
		if (!canSubmit) return;
		dispatch('submit', { email: email.trim() });
	}
</script>

<form class={classNames('flex flex-col gap-4', classes)} on:submit|preventDefault={handleSubmit}>
	<label class="form-control w-full">
		<span class="label-text mb-1">{$_('profile.emailLabel')}</span>
		<input
			type="email"
			bind:value={email}
			{disabled}
			placeholder={$_('profile.emailPlaceholder')}
			autocomplete="email"
			class="input input-bordered w-full"
		/>
	</label>

	<button
		type="submit"
		disabled={!canSubmit}
		class={classNames('btn btn-primary', { 'btn-disabled': !canSubmit })}
	>
		{#if loading}
			<span class="loading loading-spinner loading-sm"></span>
		{/if}
		{$_('profile.sendMagicLink')}
	</button>

	<p class="text-xs text-base-content/60">{$_('profile.magicLinkHint')}</p>
</form>
