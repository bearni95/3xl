<script lang="ts">
	import classNames from 'classnames';
	import { onMount } from 'svelte';
	import { _, locale } from 'svelte-i18n';
	import { authService } from '$services/auth.service';
	import { usernamePromptOpen } from '$services/usernamePrompt';
	import { AuthStatus } from '$types/profile.type';

	const status = authService.status;
	const profile = authService.profile;

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
	$: needsUsername = signedIn && $profile?.username == null;
	$: open = signedIn && ($usernamePromptOpen || (needsUsername && !dismissed));

	// Prefill with the current username each time the modal opens.
	$: if (open && $profile && seededFor !== String($profile.id)) {
		username = $profile.username ?? '';
		seededFor = String($profile.id);
	}

	$: trimmed = username.trim();
	$: canSave = trimmed.length > 0 && !saving;

	async function save(): Promise<void> {
		if (!canSave) return;
		errorMessage = null;
		saving = true;
		try {
			await authService.updateUsername(trimmed);
			close();
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : $_('errors.generic');
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
	<div class="modal modal-open" role="dialog" aria-modal="true">
		<div class="modal-box">
			<h3 class="text-lg font-semibold">{$_('profile.username.title')}</h3>
			<p class="mt-1 text-sm text-base-content/70">{$_('profile.username.prompt')}</p>

			<form class="mt-4 flex flex-col gap-4" on:submit|preventDefault={save}>
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
					<button type="button" class="btn btn-ghost" disabled={saving} on:click={close}>
						{$_('profile.username.later')}
					</button>
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
			aria-label={$_('profile.username.later')}
			on:click={close}
		></button>
	</div>
{/if}
