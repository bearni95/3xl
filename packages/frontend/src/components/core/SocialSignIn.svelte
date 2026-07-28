<script lang="ts">
	import classNames from 'classnames';
	import { createEventDispatcher } from 'svelte';
	import { _ } from 'svelte-i18n';
	import { OAUTH_PROVIDER_NAMES, OAUTH_PROVIDERS, OAuthProvider } from '$types/profile.type';
	import ProviderIcon from '$components/core/ProviderIcon.svelte';

	// Props
	/** The provider whose redirect is in flight, or `null` when idle. */
	export let pending: OAuthProvider | null = null;
	export let disabled: boolean = false;
	export let classes: string = '';

	const dispatch = createEventDispatcher<{ signin: { provider: OAuthProvider } }>();

	function handleClick(provider: OAuthProvider): void {
		if (disabled || pending) return;
		dispatch('signin', { provider });
	}
</script>

<div class={classNames('flex flex-col gap-2', classes)}>
	{#each OAUTH_PROVIDERS as provider (provider)}
		<button
			type="button"
			disabled={disabled || pending !== null}
			class={classNames('btn btn-outline w-full justify-start gap-3', {
				'btn-disabled': disabled || pending !== null
			})}
			on:click={() => handleClick(provider)}
		>
			{#if pending === provider}
				<span class="loading loading-spinner loading-sm"></span>
			{:else}
				<ProviderIcon {provider} />
			{/if}
			{$_('profile.continueWith', { values: { provider: OAUTH_PROVIDER_NAMES[provider] } })}
		</button>
	{/each}
</div>
