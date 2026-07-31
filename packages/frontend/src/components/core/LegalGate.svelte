<script lang="ts">
	import classNames from 'classnames';
	import { onMount } from 'svelte';
	import { _, json, locale } from 'svelte-i18n';
	import { authService } from '$services/auth.service';
	import { legalService } from '$services/legal.service';
	import { openLegalDocument } from '$services/legalModal';
	import { AuthStatus, type Profile } from '$types/profile.type';
	import { CONSENT_DOCUMENTS, type LegalDocumentId } from '$types/legal.type';

	// What happens when a document a player already accepted is rewritten under them.
	//
	// The acceptance on record names a version (see legal.service), so "they accepted
	// the terms" and "they accepted *these* terms" are different questions, and this
	// component is the second one being asked at every visit. When the answer is no —
	// because the text moved, or because the account predates there being a gate at all
	// — the game stops and asks again. Consent to a document nobody has read is the
	// thing the versioning exists to prevent, so it cannot be a banner that is dismissed.
	//
	// It is therefore a modal with no way out but the two real answers: accept, or sign
	// out and leave. Not a third, "later" — a player who has not accepted the current
	// terms is a player the game has no agreement with, and going on serving them under
	// the old ones would make the version meaningless. Signing out is a genuine answer
	// and the account is untouched by it; the settings sheet's delete button is there for
	// anyone who wants to go further.
	//
	// Mounted once at the layout root, like the settings sheet and the avatar picker, so
	// it is free of the map panel's stacking context and can stand over everything.

	const status = authService.status;
	const profile = authService.profile;
	const outstanding = legalService.outstanding;

	let saving = false;
	let errorMessage: string | null = null;

	onMount(() => {
		authService.init();
		legalService.init();
	});

	$: signedIn = $status === AuthStatus.SignedIn && !!($profile as Profile | null);
	// `outstanding` is empty until the ledger has actually been read, so this cannot
	// flash at a player whose acceptance is a moment away from arriving.
	$: open = signedIn && $outstanding.length > 0;

	/** A document's own title, from the catalogue. */
	function titleOf(id: LegalDocumentId): string {
		const content = $json(`legal.documents.${id}`) as { title?: string } | null;
		return content?.title ?? id;
	}

	async function acceptAll(): Promise<void> {
		if (saving) return;
		errorMessage = null;
		saving = true;
		try {
			// Every consent document at its current version, not only the ones flagged:
			// what is being recorded is the state of the agreement now, and re-recording
			// a version already on file is a no-op the ledger absorbs.
			await legalService.accept(CONSENT_DOCUMENTS, true);
		} catch {
			errorMessage = $_('legal.update.failed');
		} finally {
			saving = false;
		}
	}

	async function signOut(): Promise<void> {
		if (saving) return;
		try {
			await authService.signOut();
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : $_('errors.generic');
		}
	}
</script>

{#if open && $locale}
	<!-- No backdrop button: this dialog has no dismissal that is not one of its two
		answers, so there is nothing behind it to click. -->
	<div class="modal modal-open" role="dialog" aria-modal="true">
		<div class="modal-box flex flex-col gap-4">
			<h3 class="text-lg font-bold">{$_('legal.update.title')}</h3>
			<p class="text-sm text-base-content/70">{$_('legal.update.intro')}</p>

			<div class="flex flex-col gap-2">
				<span class="text-sm font-semibold">{$_('legal.update.changed')}</span>
				<div class="flex flex-col items-start gap-1">
					{#each $outstanding as id (id)}
						<button
							type="button"
							class="link link-primary text-sm"
							on:click={() => openLegalDocument(id)}
						>
							{titleOf(id)}
						</button>
					{/each}
				</div>
			</div>

			{#if errorMessage}
				<div class="alert alert-error">
					<span>{errorMessage}</span>
				</div>
			{/if}

			<div class="modal-action">
				<button type="button" class="btn btn-ghost" disabled={saving} on:click={signOut}>
					{$_('legal.update.signOut')}
				</button>
				<button
					type="button"
					class={classNames('btn btn-primary', { 'btn-disabled': saving })}
					disabled={saving}
					on:click={acceptAll}
				>
					{#if saving}
						<span class="loading loading-spinner loading-sm"></span>
						{$_('legal.update.saving')}
					{:else}
						{$_('legal.update.accept')}
					{/if}
				</button>
			</div>
		</div>
	</div>
{/if}
