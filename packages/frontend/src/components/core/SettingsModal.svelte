<script lang="ts">
	import classNames from 'classnames';
	import { onMount } from 'svelte';
	import { _, locale } from 'svelte-i18n';
	import { authService, UsernameRejected } from '$services/auth.service';
	import { settingsModalOpen } from '$services/settingsModal';
	import { avatarPickerOpen } from '$services/avatarPicker';
	import { AuthStatus } from '$types/profile.type';
	import ProfileCard from '$components/core/ProfileCard.svelte';
	import AccountDataRights from '$components/core/AccountDataRights.svelte';

	// The account's settings: the picture it wears, the name it goes by, the details of
	// how it signs in, and the way out of it. What the account has *earned* is not here —
	// the level and the experience bar are the panel row's, which is the thing a player
	// looks at to read their standing, and printing them again on the sheet they open to
	// change their name only said the same number twice.
	//
	// The name is a field and nothing else. It used to be a line of text with an "edit"
	// button that swapped it for the input, so the one screen that exists to change the
	// name opened with the name unchangeable; there is no reading of it to protect here,
	// so the field is what stands where the name goes, always, and the caret is the whole
	// of the old "choose a username" prompt.

	const status = authService.status;
	const profile = authService.profile;
	const loaded = authService.loaded;

	let signingOut = false;
	let errorMessage: string | null = null;

	let username = '';
	let savingName = false;
	let nameError: string | null = null;
	// Set when the player closes a modal this component raised by itself, so an
	// account with no name is asked once and not on every page it lands on.
	let dismissed = false;
	// Guards seeding the input so it happens once per opening, not on every tick.
	let seededFor: string | null = null;

	onMount(() => authService.init());

	$: signedIn = $status === AuthStatus.SignedIn && !!$profile;
	// Only once the stored row has arrived: until then every account looks nameless,
	// and acting on that would ask players who have a name to pick another.
	$: unnamed = signedIn && $loaded && $profile?.username == null;

	// Signing out empties the profile, which closes the modal on its own.
	$: open = signedIn && ($settingsModalOpen || (unnamed && !dismissed));

	// Prefill from the stored name each time the modal opens.
	$: if (open && $profile && seededFor !== String($profile.id)) {
		username = $profile.username ?? '';
		seededFor = String($profile.id);
	}

	$: trimmedName = username.trim();
	// Blank is an answer too: emptying the field clears the name and leaves the
	// account unnamed, which is where every account starts and may stay. So the only
	// thing that disables saving is having nothing to change.
	$: canSaveName = !savingName && trimmedName !== ($profile?.username ?? '');

	async function saveName(): Promise<void> {
		if (!canSaveName) return;
		nameError = null;
		savingName = true;
		try {
			await authService.updateUsername(trimmedName);
		} catch (error) {
			// A name the server turned down is said in the player's language; anything
			// else really is a failure and is reported as it came.
			if (error instanceof UsernameRejected) {
				nameError = $_(`profile.username.${error.reason}`);
			} else {
				nameError = error instanceof Error ? error.message : $_('errors.generic');
			}
		} finally {
			savingName = false;
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

	// The avatar hands the screen over to its own modal rather than stacking one
	// dialog on another.
	function openAvatarPicker(): void {
		close();
		avatarPickerOpen.set(true);
	}

	function close(): void {
		errorMessage = null;
		nameError = null;
		settingsModalOpen.set(false);
		dismissed = true;
		seededFor = null;
	}
</script>

<!-- Mounted at the layout root so it is a modal like any other, free of the panel's
	stacking context. -->
{#if open && $locale && $profile}
	<div class="modal modal-open" role="dialog" aria-modal="true">
		<div class="modal-box">
			<!-- The card brings the picture, the details list and the sign-out button; the
				name column is this sheet's, and what it puts there is the field. -->
			<ProfileCard
				profile={$profile}
				{signingOut}
				on:signout={handleSignOut}
				on:editavatar={openAvatarPicker}
			>
				<form slot="name" class="flex flex-col gap-2" on:submit|preventDefault={saveName}>
					<label class="form-control w-full">
						<span class="label-text mb-1">{$_('profile.username.label')}</span>
						<div class="flex gap-2">
							<!-- Focused only when the sheet came up by itself for a nameless account:
								then it is here to be asked, so the caret belongs in it. A player who
								opened their own settings may have come for anything on the sheet. -->
							<!-- svelte-ignore a11y-autofocus -->
							<input
								type="text"
								bind:value={username}
								disabled={savingName}
								maxlength={32}
								autofocus={unnamed}
								placeholder={$_('profile.username.placeholder')}
								class="input input-bordered flex-1"
							/>
							<button
								type="submit"
								disabled={!canSaveName}
								class={classNames('btn btn-primary', { 'btn-disabled': !canSaveName })}
							>
								{#if savingName}
									<span class="loading loading-spinner loading-sm"></span>
								{/if}
								{$_('profile.username.save')}
							</button>
						</div>
					</label>

					{#if nameError}
						<div class="alert alert-error">
							<span>{nameError}</span>
						</div>
					{/if}
				</form>
			</ProfileCard>

			<!-- The data rights, under the account they are about: the copy of everything
				held, the record of what has been accepted, and the way out for good.
				Only when the player opened this sheet themselves. It comes up by itself
				for an account with no name yet, and that opening is one question — what
				do you want to be called — with the caret already in the field; putting
				"delete your account" under somebody's first minute answers a question
				nobody asked. -->
			{#if $settingsModalOpen}
				<AccountDataRights classes="mt-4" />
			{/if}

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
