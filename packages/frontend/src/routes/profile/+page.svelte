<script lang="ts">
	import { onMount } from 'svelte';
	import { _ } from 'svelte-i18n';
	import { authService } from '$services/auth.service';
	import { AuthStatus } from '$types/profile.type';
	import MagicLinkForm from '$components/core/MagicLinkForm.svelte';
	import ProfileCard from '$components/core/ProfileCard.svelte';

	const status = authService.status;
	const profile = authService.profile;

	let sending = false;
	let signingOut = false;
	let sentTo: string | null = null;
	let errorMessage: string | null = null;

	onMount(() => authService.init());

	async function handleMagicLink(event: CustomEvent<{ email: string }>): Promise<void> {
		errorMessage = null;
		sending = true;
		try {
			await authService.sendMagicLink(event.detail.email);
			sentTo = event.detail.email;
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : $_('errors.generic');
		} finally {
			sending = false;
		}
	}

	async function handleSignOut(): Promise<void> {
		errorMessage = null;
		signingOut = true;
		try {
			await authService.signOut();
			sentTo = null;
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : $_('errors.generic');
		} finally {
			signingOut = false;
		}
	}

	function resetFlow(): void {
		sentTo = null;
		errorMessage = null;
	}
</script>

<div class="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-base-200 p-6">
	<div class="card w-full max-w-md bg-base-100 shadow-xl">
		<div class="card-body gap-4">
			<h1 class="card-title text-2xl">{$_('profile.title')}</h1>

			{#if !authService.configured}
				<div class="alert alert-warning">
					<span>{$_('profile.notConfigured')}</span>
				</div>
			{:else if $status === AuthStatus.Loading}
				<div class="flex justify-center py-8">
					<span class="loading loading-spinner loading-lg"></span>
				</div>
			{:else if $status === AuthStatus.SignedIn && $profile}
				<ProfileCard profile={$profile} {signingOut} on:signout={handleSignOut} />
			{:else if sentTo}
				<div class="flex flex-col gap-4">
					<div class="alert alert-success">
						<span>{$_('profile.checkEmail', { values: { email: sentTo } })}</span>
					</div>
					<button type="button" class="btn btn-ghost btn-sm" on:click={resetFlow}>
						{$_('profile.useAnotherEmail')}
					</button>
				</div>
			{:else}
				<p class="text-sm text-base-content/70">{$_('profile.signInPrompt')}</p>
				<MagicLinkForm loading={sending} on:submit={handleMagicLink} />
			{/if}

			{#if errorMessage}
				<div class="alert alert-error">
					<span>{errorMessage}</span>
				</div>
			{/if}
		</div>
	</div>
</div>
