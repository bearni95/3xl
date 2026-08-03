<script lang="ts">
	import { _, locale } from 'svelte-i18n';
	import { authService } from '$services/auth.service';
	import { legalService } from '$services/legal.service';
	import { closeSignIn, signInModalOpen } from '$services/signInModal';
	import type { OAuthProvider } from '$types/profile.type';
	import { CONSENT_DOCUMENTS, LEGAL_VERSIONS } from '$types/legal.type';
	import LegalConsent from '$components/core/LegalConsent.svelte';
	import SocialSignIn from '$components/core/SocialSignIn.svelte';

	// The way in: the gate's two boxes, the documents under them and the provider button.
	//
	// All of it stood open at the foot of the map, on a plate of its own — a form of two
	// checkboxes, four links and a paragraph of fine print, every word at 12px, taking the
	// height of the corner from a visitor who had not asked for it yet. What is left down
	// there is a button (see SignInButton), and what that button asks for is this. A door
	// is a word; the paperwork is behind it.
	//
	// Mounted once at the layout root, like the settings sheet and the avatar picker, so it
	// is free of the map panel's stacking context — and free of the panel's own `{#if}`,
	// which is what lets the legal documents be read without the ticks above them being
	// lost: the document sheet is z-[1300] and stands over this box, this box stays mounted
	// underneath, and the boxes are still ticked when the reader comes back.
	//
	// The state is the component's, so putting the sheet away un-ticks everything. That is
	// the honest reading: an acceptance is an act, and somebody who closed the door without
	// going through it has not made one.
	//
	// Nothing is initialised here. `authService.init()` and `legalService.init()` are
	// LegalGate's, at the layout root, where something is mounted at every visit — this
	// modal is only up while it is being answered.

	let redirectingTo: OAuthProvider | null = null;
	let errorMessage: string | null = null;

	// The gate in front of the provider button. Both have to be ticked before there is
	// anything to press, and `consentAsked` is what makes the reason visible: a button
	// that is simply dead says nothing about why.
	let ageConfirmed = false;
	let documentsAccepted = false;
	let consentAsked = false;
	$: consented = ageConfirmed && documentsAccepted;

	// Signing in leaves the page, so the only thing that closes this is the reader.
	function close(): void {
		if (redirectingTo) return;
		errorMessage = null;
		consentAsked = false;
		closeSignIn();
	}

	async function handleProviderSignIn(
		event: CustomEvent<{ provider: OAuthProvider }>
	): Promise<void> {
		if (redirectingTo) return;
		consentAsked = true;
		if (!consented) return;
		errorMessage = null;
		redirectingTo = event.detail.provider;
		// Held in the browser because this tab is about to be gone: the boxes are ticked
		// by somebody the game has no id for yet, and the ledger cannot record an
		// acceptance for an account that does not exist. It is picked back up and
		// written the instant a session lands.
		legalService.hold({
			versions: Object.fromEntries(CONSENT_DOCUMENTS.map((id) => [id, LEGAL_VERSIONS[id]])),
			ageConfirmed,
			at: new Date().toISOString()
		});
		try {
			// On success the browser leaves for the provider's consent screen, so the
			// spinner stays up until the page is gone. Only a failure lands here.
			await authService.signInWithProvider(event.detail.provider);
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : $_('errors.generic');
			redirectingTo = null;
		}
	}
</script>

<!-- Contents format i18n messages; wait for the locale to load, or the box would appear
	empty and then fill. -->
{#if $signInModalOpen && $locale}
	<div class="modal modal-open" role="dialog" aria-modal="true">
		<div class="modal-box flex flex-col gap-4">
			{#if !authService.configured}
				<div class="alert alert-warning">
					<span>{$_('profile.notConfigured')}</span>
				</div>
			{:else}
				<!-- The gate above the button, not beside it: the two boxes are read before the
					way in is offered, and the button below is held shut until they are ticked.
					The button is still pressable while they are not — it is what makes the reason
					appear — it simply does not leave the page. -->
				<LegalConsent
					bind:ageConfirmed
					bind:accepted={documentsAccepted}
					showRequired={consentAsked}
					disabled={redirectingTo !== null}
				/>
				<SocialSignIn pending={redirectingTo} on:signin={handleProviderSignIn} />
			{/if}

			{#if errorMessage}
				<div class="alert alert-error">
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
