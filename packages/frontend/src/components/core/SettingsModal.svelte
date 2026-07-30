<script lang="ts">
	import { onMount } from 'svelte';
	import { _, locale } from 'svelte-i18n';
	import { authService } from '$services/auth.service';
	import { profileModalOpen } from '$services/profileModal';
	import { usernamePromptOpen } from '$services/usernamePrompt';
	import { avatarPickerOpen } from '$services/avatarPicker';
	import { AuthStatus } from '$types/profile.type';
	import ProfileCard from '$components/core/ProfileCard.svelte';

	const status = authService.status;
	const profile = authService.profile;

	let signingOut = false;
	let errorMessage: string | null = null;

	onMount(() => authService.init());

	// Signing out empties the profile, which closes the modal on its own.
	$: open = $profileModalOpen && $status === AuthStatus.SignedIn && !!$profile;

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

	// Both edits hand the screen over to their own modal rather than stacking one
	// dialog on another.
	function openUsernamePrompt(): void {
		close();
		usernamePromptOpen.set(true);
	}

	function openAvatarPicker(): void {
		close();
		avatarPickerOpen.set(true);
	}

	function close(): void {
		errorMessage = null;
		profileModalOpen.set(false);
	}
</script>

<!-- The full profile card — the details list and the sign-out button the glance card
	in the map panel does without. Mounted here at the layout root so it is a modal like
	any other, free of the panel's stacking context. -->
{#if open && $locale && $profile}
	<div class="modal modal-open" role="dialog" aria-modal="true">
		<div class="modal-box">
			<ProfileCard
				profile={$profile}
				{signingOut}
				on:signout={handleSignOut}
				on:editusername={openUsernamePrompt}
				on:editavatar={openAvatarPicker}
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
			on:click={close}
		></button>
	</div>
{/if}
