<script lang="ts">
	import classNames from 'classnames';
	import { onMount } from 'svelte';
	import { _, locale } from 'svelte-i18n';
	import { authService } from '$services/auth.service';
	import { signInPanelOpen } from '$services/signInPanel';
	import { usernamePromptOpen } from '$services/usernamePrompt';
	import { avatarPickerOpen } from '$services/avatarPicker';
	import { profileModalOpen } from '$services/profileModal';
	import { rosterModalOpen } from '$services/rosterModal';
	import { AuthStatus, type OAuthProvider } from '$types/profile.type';
	import PlayerAvatar from '$components/core/PlayerAvatar.svelte';
	import ProfileCard from '$components/core/ProfileCard.svelte';
	import SocialSignIn from '$components/core/SocialSignIn.svelte';

	// When embedded, the trigger button is dropped and the card renders in flow,
	// always visible and full-width — it is a section of the map page's right-hand
	// panel — instead of the hover/click dropdown that hangs off the navbar.
	export let embedded: boolean = false;

	const status = authService.status;
	const profile = authService.profile;

	let signingOut = false;
	let redirectingTo: OAuthProvider | null = null;
	let errorMessage: string | null = null;

	onMount(() => authService.init());

	$: profileInitial = ($profile?.displayName || $profile?.email || '?').charAt(0).toUpperCase();

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

	function openUsernamePrompt(): void {
		usernamePromptOpen.set(true);
	}

	function openProfile(): void {
		// The full card is a modal of its own, mounted at the layout root — raising it
		// from here would trap it inside the map panel's stacking context.
		errorMessage = null;
		profileModalOpen.set(true);
	}

	function openRoster(): void {
		// Like the profile card, the roster is a modal mounted at the layout root — the
		// glance card only raises it.
		rosterModalOpen.set(true);
	}

	function openAvatarPicker(): void {
		avatarPickerOpen.set(true);
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
				<PlayerAvatar
					characterId={$profile.avatarCharacterId}
					initial={profileInitial}
					size="w-6"
					textClasses="text-xs"
				/>
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
							on:openroster={openRoster}
							on:editavatar={openAvatarPicker}
						/>
					{:else}
						<SocialSignIn pending={redirectingTo} on:signin={handleProviderSignIn} />
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
