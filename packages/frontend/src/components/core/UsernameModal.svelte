<script lang="ts">
	import classNames from 'classnames';
	import { onMount } from 'svelte';
	import { _, locale } from 'svelte-i18n';
	import { authService, UsernameRejected } from '$services/auth.service';
	import { usernamePromptOpen } from '$services/usernamePrompt';
	import { AuthStatus } from '$types/profile.type';

	const status = authService.status;
	const profile = authService.profile;
	const loaded = authService.loaded;

	let username = '';
	let saving = false;
	let errorMessage: string | null = null;
	// Set once the visitor closes the modal without choosing, so the first-login
	// auto-prompt doesn't immediately reopen. Cleared when forced open again.
	let dismissed = false;
	// Guards seeding the input so it happens once per opening, not every tick.
	let seededFor: string | null = null;

	onMount(() => authService.init());

	// A forced open (profile card button) always re-arms the modal.
	$: if ($usernamePromptOpen) dismissed = false;

	$: signedIn = $status === AuthStatus.SignedIn && !!$profile;
	// Only once the stored profile has actually arrived: until then every account
	// looks nameless, and prompting on that would ask half the players who already
	// have a name to pick one again.
	$: needsUsername = signedIn && $loaded && $profile?.username == null;
	$: open = signedIn && ($usernamePromptOpen || (needsUsername && !dismissed));

	// Prefill with the current username each time the modal opens.
	$: if (open && $profile && seededFor !== String($profile.id)) {
		username = $profile.username ?? '';
		seededFor = String($profile.id);
	}

	$: trimmed = username.trim();
	// Blank is a name too — emptying the field clears the username and leaves the
	// account nameless, which is where every account starts and is allowed to stay.
	// So the only thing that disables saving is having nothing to change.
	$: canSave = !saving && trimmed !== ($profile?.username ?? '');

	async function save(): Promise<void> {
		if (!canSave) return;
		errorMessage = null;
		saving = true;
		try {
			await authService.updateUsername(trimmed);
			close();
		} catch (error) {
			// A name the server turned down is said in the player's language; anything
			// else really is a failure and is reported as it came.
			if (error instanceof UsernameRejected) {
				errorMessage = $_(`profile.username.${error.reason}`);
			} else {
				errorMessage = error instanceof Error ? error.message : $_('errors.generic');
			}
		} finally {
			saving = false;
		}
	}

	function close(): void {
		usernamePromptOpen.set(false);
		dismissed = true;
		seededFor = null;
	}
</script>

{#if open && $locale}
	<!-- The field is the whole dialog, so its label is the dialog's name too: there is
		no heading and no explanation above it to serve as one. -->
	<div class="modal modal-open" role="dialog" aria-modal="true" aria-label={$_('profile.username.label')}>
		<div class="modal-box">
			<form class="flex flex-col gap-4" on:submit|preventDefault={save}>
				<label class="form-control w-full">
					<span class="label-text mb-1">{$_('profile.username.label')}</span>
					<!-- svelte-ignore a11y-autofocus -->
					<input
						type="text"
						bind:value={username}
						disabled={saving}
						maxlength={32}
						autofocus
						placeholder={$_('profile.username.placeholder')}
						class="input input-bordered w-full"
					/>
				</label>

				{#if errorMessage}
					<div class="alert alert-error">
						<span>{errorMessage}</span>
					</div>
				{/if}

				<div class="modal-action">
					<button
						type="submit"
						disabled={!canSave}
						class={classNames('btn btn-primary', { 'btn-disabled': !canSave })}
					>
						{#if saving}
							<span class="loading loading-spinner loading-sm"></span>
						{/if}
						{$_('profile.username.save')}
					</button>
				</div>
			</form>
		</div>
		<button
			type="button"
			class="modal-backdrop"
			aria-label={$_('common.close')}
			on:click={close}
		></button>
	</div>
{/if}
