<script lang="ts">
	import classNames from 'classnames';
	import { onMount } from 'svelte';
	import { _, locale } from 'svelte-i18n';
	import { authService } from '$services/auth.service';
	import { spawnService, type BoostersStatus } from '$services/spawn.service';
	import { signInPanelOpen } from '$services/signInPanel';
	import { usernamePromptOpen } from '$services/usernamePrompt';
	import { AuthStatus } from '$types/profile.type';
	import ProfileCard from '$components/core/ProfileCard.svelte';
	import MagicLinkForm from '$components/core/MagicLinkForm.svelte';

	// When pinned, the trigger button is dropped and the panel renders as a
	// fixed, always-visible card (used top-left on the map page) instead of the
	// hover/click dropdown that hangs off the navbar.
	export let pinned: boolean = false;

	const status = authService.status;
	const profile = authService.profile;

	let signingOut = false;
	let sending = false;
	let sentTo: string | null = null;
	let errorMessage: string | null = null;

	// The signed-in player's daily booster allowance, shown by the pinned map panel's
	// ProfileCard. Only loaded when pinned (the navbar dropdown doesn't show it).
	let boosters: BoostersStatus | null = null;

	onMount(() => authService.init());

	$: profileInitial = ($profile?.displayName || $profile?.email || '?').charAt(0).toUpperCase();

	// Refresh the daily allowance whenever the pinned panel has a signed-in player.
	// Keyed on `$profile` so a claim spent elsewhere (or a level-up that raises the
	// cap) re-reads it. All deps named so the statement actually re-runs.
	$: if (pinned && $status === AuthStatus.SignedIn && $profile) {
		void loadBoosters();
	}

	async function loadBoosters(): Promise<void> {
		try {
			boosters = await spawnService.boostersStatus();
		} catch {
			boosters = null;
		}
	}

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
	}

	function openUsernamePrompt(): void {
		usernamePromptOpen.set(true);
	}

	function togglePanel(): void {
		signInPanelOpen.update((open) => !open);
	}

	function closePanel(): void {
		signInPanelOpen.set(false);
	}
</script>

<div class={pinned ? '' : 'group relative'}>
	{#if !pinned}
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
			pinned
				? 'fixed left-4 top-20 z-[1100] visible translate-y-0 opacity-100'
				: [
						'absolute right-0 top-full z-20 origin-top pt-2 transition duration-200 ease-out',
						'group-hover:visible group-hover:translate-y-0 group-hover:opacity-100',
						$signInPanelOpen
							? 'visible translate-y-0 opacity-100'
							: 'invisible -translate-y-2 opacity-0'
					]
		)}
	>
		<div class="card w-80 bg-base-100 shadow-xl">
			<div class="card-body gap-4">
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
							compact={pinned}
							boosters={pinned ? boosters : null}
							on:signout={handleSignOut}
							on:editusername={openUsernamePrompt}
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
						<MagicLinkForm loading={sending} on:submit={handleMagicLink} />
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

<!-- Click-away layer to close the panel when it was opened programmatically. -->
{#if $signInPanelOpen}
	<button
		type="button"
		class="fixed inset-0 z-10 cursor-default"
		tabindex="-1"
		aria-label="Close sign-in"
		on:click={closePanel}
	></button>
{/if}
