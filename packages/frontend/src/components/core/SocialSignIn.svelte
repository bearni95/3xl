<script lang="ts">
	import classNames from 'classnames';
	import { createEventDispatcher } from 'svelte';
	import { _ } from 'svelte-i18n';
	import { OAUTH_PROVIDER_NAMES, OAuthProvider } from '$types/profile.type';
	import ProviderIcon from '$components/core/ProviderIcon.svelte';

	// Props
	/** The provider whose redirect is in flight, or `null` when idle. */
	export let pending: OAuthProvider | null = null;
	export let disabled: boolean = false;
	export let classes: string = '';

	const dispatch = createEventDispatcher<{ signin: { provider: OAuthProvider } }>();

	// Google is the only way in. Other identities stay understood (an account linked
	// to one keeps working), they are simply not offered here.
	const provider = OAuthProvider.Google;

	function handleClick(): void {
		if (disabled || pending) return;
		dispatch('signin', { provider });
	}
</script>

<div class={classNames('flex flex-col gap-2', classes)}>
	<button
		type="button"
		disabled={disabled || pending !== null}
		class={classNames('btn btn-outline w-full justify-start gap-3', {
			'btn-disabled': disabled || pending !== null
		})}
		on:click={handleClick}
	>
		{#if pending === provider}
			<span class="loading loading-spinner loading-sm"></span>
		{:else}
			<ProviderIcon {provider} />
		{/if}
		{$_('profile.continueWith', { values: { provider: OAUTH_PROVIDER_NAMES[provider] } })}
	</button>
</div>
