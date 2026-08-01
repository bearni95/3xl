<script lang="ts">
	import classNames from 'classnames';
	import { _, locale } from 'svelte-i18n';
	import { authService } from '$services/auth.service';
	import { legalService } from '$services/legal.service';
	import type { OAuthProvider } from '$types/profile.type';
	import { CONSENT_DOCUMENTS, LEGAL_VERSIONS } from '$types/legal.type';
	import LegalConsent from '$components/core/LegalConsent.svelte';
	import SocialSignIn from '$components/core/SocialSignIn.svelte';

	// The way in, at the foot of the map: the gate and the provider button, on the plate
	// the account's own reading takes once there is an account (see PlayerPanel). It stood
	// in the burger menu, under that menu's block of buttons — which meant the one thing a
	// visitor with no account can actually do here was the one thing they had to go looking
	// for, behind a mark at the end of the breadcrumb bar. Everything else in that menu is a
	// view over the map; this is not a view, it is the door.
	//
	// So it is the account's own place rather than one of its own: signed out this panel is
	// what that corner says, signed in the plate is, and the column reads the same either way
	// — who is playing, or how to become someone who is. It takes the column's whole width
	// where the plate takes half of a row, which is the host's arrangement to make (see the
	// map page): a form is not a thing that fits in half of 400px.
	//
	// Whether there is a door to draw at all is the host's to say, not this panel's: the
	// corner it stands in only exists when there is something to put in it, so the same
	// answer would have had to be worked out twice. What the host answers is the whole of
	// the session's three states and not two of them — nothing is drawn while it is still
	// being read, because the plate this gives way to is a moment behind on a visit with a
	// session already on disk, and a door offered and then withdrawn is worse than a corner
	// that fills in once.
	//
	// A solid base-100 rather than the four fifths the corner's other plates wear: those are
	// two lines of large type that survive the terrain coming through them, and this is a
	// form — two checkboxes, four links and a paragraph of fine print, every word of which is
	// read at 12px. It is the same rule the menu's block of buttons stands on: the map may
	// come through beside a label, never behind one.
	//
	// Nothing is initialised here. `authService.init()` and `legalService.init()` are
	// LegalGate's, at the layout root, where something is mounted at every visit — this panel
	// is gone the moment it works, so it is the wrong thing to make the session depend on.

	export let classes: string = '';

	let redirectingTo: OAuthProvider | null = null;
	let errorMessage: string | null = null;

	// The gate in front of the provider button. Both have to be ticked before there is
	// anything to press, and `consentAsked` is what makes the reason visible: a button
	// that is simply dead says nothing about why.
	let ageConfirmed = false;
	let documentsAccepted = false;
	let consentAsked = false;
	$: consented = ageConfirmed && documentsAccepted;

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

<!-- Contents format i18n messages; wait for the locale to load, or the plate would appear
	empty and then fill. -->
{#if $locale}
	<div class={classNames('flex flex-col gap-3 rounded-lg bg-base-100 p-3 shadow-xl', classes)}>
		{#if !authService.configured}
			<div class="alert alert-warning">
				<span>{$_('profile.notConfigured')}</span>
			</div>
		{:else}
			<!-- The gate above the button, not beside it: the two boxes are read before the way
				in is offered, and the button below is held shut until they are ticked. The button
				is still pressable while they are not — it is what makes the reason appear — it
				simply does not leave the page. -->
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
{/if}
