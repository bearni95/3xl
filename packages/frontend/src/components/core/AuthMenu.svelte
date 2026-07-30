<script lang="ts">
	import classNames from 'classnames';
	import { onMount } from 'svelte';
	import { _, locale } from 'svelte-i18n';
	import { authService } from '$services/auth.service';
	import { signInPanelOpen } from '$services/signInPanel';
	import { avatarPickerOpen } from '$services/avatarPicker';
	import { settingsModalOpen } from '$services/settingsModal';
	import { AuthStatus, type OAuthProvider } from '$types/profile.type';
	import PlayerAvatar from '$components/core/PlayerAvatar.svelte';
	import ProfileCard from '$components/core/ProfileCard.svelte';
	import SocialSignIn from '$components/core/SocialSignIn.svelte';

	// When embedded, the trigger button is dropped and what is left renders in flow, full
	// width — it is a section of the map page's right-hand panel — instead of the hover/click
	// dropdown that hangs off the navbar. Embedded, that leaves the sign-in and nothing else:
	// the account's own buttons are in the panel's one stack of them now, who is playing is a
	// plate at the map's top-right corner (see PlayerPanel), and the side they field stands at
	// its foot. So embedded this is the way *in*, and the whole account card when it is not.
	export let embedded: boolean = false;

	const status = authService.status;
	const profile = authService.profile;

	let signingOut = false;
	let redirectingTo: OAuthProvider | null = null;
	let errorMessage: string | null = null;

	onMount(() => authService.init());

	// Both stand on the chosen name alone: an account nobody has named yet reads as
	// a question mark and as "Unnamed player", never as its email address.
	$: profileInitial = ($profile?.username || '?').charAt(0).toUpperCase();
	// The navbar chip sits outside the locale guard below, so the placeholder waits
	// for the catalogue rather than formatting against no locale at all.
	$: profileName = $profile?.username || ($locale ? $_('profile.username.none') : '');

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

	// Naming the account happens on the settings sheet, where the field is simply always
	// there — so the dropdown's button has nothing to ask for beyond raising it.
	function openSettings(): void {
		// The sheet is a modal of its own, mounted at the layout root — raising it from
		// here would trap it inside the map panel's stacking context.
		errorMessage = null;
		settingsModalOpen.set(true);
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
				<span
					class={classNames('max-w-[10rem] truncate', {
						'text-base-content/60 italic': !$profile.username
					})}>{profileName}</span
				>
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
		<!-- Embedded it is not a card of its own: the panel section it sits in already
			brings the surface and the padding, so a second box drawn inside it only reads as a
			seam. No background, no radius, no shadow, no width. The contents differ as well:
			the dropdown is the full account card, the panel is the sign-in alone. -->
		<div class={embedded ? 'w-full' : 'card w-80 bg-base-100 shadow-xl'}>
			<div class={classNames('gap-4', embedded ? 'flex flex-col' : 'card-body')}>
				<!-- Contents format i18n messages; wait for the locale to load. -->
				{#if $locale}
					{#if !authService.configured}
						<div class="alert alert-warning">
							<span>{$_('profile.notConfigured')}</span>
						</div>
					{:else if $status === AuthStatus.SignedIn && $profile}
						<!-- Embedded there is nothing to draw for a signed-in account: everything this
							section used to hold has somewhere better to be — its buttons are in the
							panel's own stack of them, the picture and the reading are on a plate at the
							map's top-right corner, and the side they field stands at its foot. The
							dropdown is still the whole card. -->
						{#if !embedded}
							<ProfileCard
								profile={$profile}
								{signingOut}
								on:signout={handleSignOut}
								on:editusername={openSettings}
								on:editavatar={openAvatarPicker}
							/>
						{/if}
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
