<script lang="ts">
	import classNames from 'classnames';
	import { onMount } from 'svelte';
	import { _, locale } from 'svelte-i18n';
	import { authService } from '$services/auth.service';
	import { signInPanelOpen } from '$services/signInPanel';
	import { usernamePromptOpen } from '$services/usernamePrompt';
	import { AuthStatus, type OAuthProvider } from '$types/profile.type';
	import ProfileCard from '$components/core/ProfileCard.svelte';
	import MagicLinkForm from '$components/core/MagicLinkForm.svelte';
	import SocialSignIn from '$components/core/SocialSignIn.svelte';

	// When embedded, the trigger button is dropped and the card renders in flow,
	// always visible and full-width — it is a section of the map page's right-hand
	// panel — instead of the hover/click dropdown that hangs off the navbar.
	export let embedded: boolean = false;

	const status = authService.status;
	const profile = authService.profile;

	let signingOut = false;
	let sending = false;
	let redirectingTo: OAuthProvider | null = null;
	let sentTo: string | null = null;
	let errorMessage: string | null = null;
	// Whether the embedded card's full-profile dialog is up. The embedded card is a
	// glance card — no email, no account id, no sign-out — so the button beside the
	// name raises the very same card the navbar drops down, in full.
	let profileOpen = false;

	onMount(() => authService.init());

	$: profileInitial = ($profile?.displayName || $profile?.email || '?').charAt(0).toUpperCase();

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

	async function handleProviderSignIn(
		event: CustomEvent<{ provider: OAuthProvider }>
	): Promise<void> {
		if (redirectingTo) return;
		errorMessage = null;
		redirectingTo = event.detail.provider;
		try {
			// On success the browser leaves for the provider's consent screen, so the
			// spinner stays up until the page is gone. Only a failure lands here.
			await authService.signInWithProvider(event.detail.provider);
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : $_('errors.generic');
			redirectingTo = null;
		}
	}

	async function handleSignOut(): Promise<void> {
		if (signingOut) return;
		errorMessage = null;
		signingOut = true;
		try {
			await authService.signOut();
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : $_('errors.generic');
		} finally {
			signingOut = false;
		}
	}

	function resetFlow(): void {
		sentTo = null;
		errorMessage = null;
		redirectingTo = null;
	}

	function openUsernamePrompt(): void {
		// Editing is reached through the full card, so hand the screen over to the
		// username modal rather than stacking it over this dialog.
		profileOpen = false;
		usernamePromptOpen.set(true);
	}

	function openProfile(): void {
		errorMessage = null;
		profileOpen = true;
	}

	function closeProfile(): void {
		profileOpen = false;
	}

	function togglePanel(): void {
		signInPanelOpen.update((open) => !open);
	}

	function closePanel(): void {
		signInPanelOpen.set(false);
	}
</script>

<div class={embedded ? 'w-full' : 'group relative'}>
	{#if !embedded}
		{#if $status === AuthStatus.Loading}
			<button type="button" class="btn btn-ghost btn-sm btn-disabled" aria-label="Loading account">
				<span class="loading loading-spinner loading-sm"></span>
			</button>
		{:else if $status === AuthStatus.SignedIn && $profile}
			<!-- Signed-in username; hovering slides the profile card down. -->
			<button type="button" class="btn btn-ghost btn-sm gap-2">
				<div class="avatar avatar-placeholder">
					<div class="w-6 rounded-full bg-primary text-primary-content">
						<span class="text-xs">{profileInitial}</span>
					</div>
				</div>
				<span class="max-w-[10rem] truncate">{$profile.displayName}</span>
			</button>
		{:else}
			<button type="button" class="btn btn-primary btn-sm" on:click={togglePanel}>Sign in</button>
		{/if}
	{/if}

	<!-- pt-2 keeps the hover area unbroken across the visual gap. -->
	<div
		class={classNames(
			embedded
				? 'w-full'
				: [
						'absolute right-0 top-full z-20 origin-top pt-2 transition duration-200 ease-out',
						'group-hover:visible group-hover:translate-y-0 group-hover:opacity-100',
						$signInPanelOpen
							? 'visible translate-y-0 opacity-100'
							: 'invisible -translate-y-2 opacity-0'
					]
		)}
	>
		<!-- Same contents either way, but embedded it is not a card of its own: the panel
			section it sits in already brings the surface, the rounded corners and the
			border, so a second box drawn inside it only reads as a seam. No background, no
			radius, no shadow, no width — and the padding is the host section's. -->
		<div class={embedded ? 'w-full' : 'card w-80 bg-base-100 shadow-xl'}>
			<div class={classNames('gap-4', embedded ? 'flex flex-col' : 'card-body')}>
				<!-- Contents format i18n messages; wait for the locale to load. -->
				{#if $locale}
					{#if !authService.configured}
						<div class="alert alert-warning">
							<span>{$_('profile.notConfigured')}</span>
						</div>
					{:else if $status === AuthStatus.SignedIn && $profile}
						<ProfileCard
							profile={$profile}
							{signingOut}
							compact={embedded}
							on:signout={handleSignOut}
							on:editusername={openUsernamePrompt}
							on:openprofile={openProfile}
						/>
					{:else if sentTo}
						<div class="alert alert-success">
							<span>{$_('profile.checkEmail', { values: { email: sentTo } })}</span>
						</div>
						<button type="button" class="btn btn-ghost btn-sm" on:click={resetFlow}>
							{$_('profile.useAnotherEmail')}
						</button>
					{:else}
						<p class="text-sm text-base-content/70">{$_('profile.signInPrompt')}</p>
						<SocialSignIn
							pending={redirectingTo}
							disabled={sending}
							on:signin={handleProviderSignIn}
						/>
						<div class="divider my-0 text-xs text-base-content/50">
							{$_('profile.orDivider')}
						</div>
						<MagicLinkForm
							loading={sending}
							disabled={redirectingTo !== null}
							on:submit={handleMagicLink}
						/>
					{/if}

					{#if errorMessage}
						<div class="alert alert-error">
							<span>{errorMessage}</span>
						</div>
					{/if}
				{/if}
			</div>
		</div>
	</div>
</div>

<!-- The embedded card's full profile, raised over whatever it is pinned on (the map).
	Exactly the card the navbar hangs off the username — same component, uncompacted —
	so the details list and the sign-out button read identically in both places, and a
	sign-out error is shown here rather than behind the dialog. It closes itself as the
	profile goes (signing out empties it) and on the backdrop. -->
{#if profileOpen && $locale && $status === AuthStatus.SignedIn && $profile}
	<div class="modal modal-open" role="dialog" aria-modal="true">
		<div class="modal-box">
			<ProfileCard
				profile={$profile}
				{signingOut}
				on:signout={handleSignOut}
				on:editusername={openUsernamePrompt}
			/>

			{#if errorMessage}
				<div class="alert alert-error mt-4">
					<span>{errorMessage}</span>
				</div>
			{/if}
		</div>
		<button
			type="button"
			class="modal-backdrop"
			aria-label={$_('common.close')}
			on:click={closeProfile}
		></button>
	</div>
{/if}

<!-- Click-away layer to close the panel when it was opened programmatically. Only the
	dropdown has anything to close — the embedded card is always on screen. -->
{#if $signInPanelOpen && !embedded}
	<button
		type="button"
		class="fixed inset-0 z-10 cursor-default"
		tabindex="-1"
		aria-label="Close sign-in"
		on:click={closePanel}
	></button>
{/if}
