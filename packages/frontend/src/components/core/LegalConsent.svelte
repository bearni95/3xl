<script lang="ts">
	import classNames from 'classnames';
	import { _, json } from 'svelte-i18n';
	import { openLegalDocument } from '$services/legalModal';
	import { LEGAL_DOCUMENTS, LegalDocumentId, MINIMUM_AGE } from '$types/legal.type';

	// The gate: the two things a player says before there is an account to say them
	// about. It sits above the Google button and holds it shut until both are ticked.
	//
	// Two boxes rather than one, because they are two different statements and bundling
	// them would make each one worth less. The first is an age attestation — sixteen,
	// the strictest floor GDPR art. 8 lets a member state set, which also clears COPPA's
	// thirteen by a distance, so one gate stands everywhere the game can be played from.
	// The second is acceptance of the contract, with the privacy notice named alongside
	// it because a player has to be told what happens to their data before it happens,
	// not because their consent is what makes the processing lawful — that is the
	// contract itself (art. 6(1)(b)), which is why there is no box here to un-tick later.
	//
	// Neither box is pre-ticked, and there is no "by continuing you agree": an acceptance
	// has to be an act. The links open the documents on the sheet without leaving the
	// sign-in, so reading them costs nothing and the ticks survive it.

	// Props — both bindable: the host is what puts them on the wire.
	export let ageConfirmed: boolean = false;
	export let accepted: boolean = false;
	/** Say out loud that the boxes are what is holding things up. Set by the host when
	 * the player has tried to sign in without them. */
	export let showRequired: boolean = false;
	export let disabled: boolean = false;
	export let classes: string = '';

	/** A document's own title, so a link can never say something its heading does not. */
	function titleOf(id: LegalDocumentId): string {
		const content = $json(`legal.documents.${id}`) as { title?: string } | null;
		return content?.title ?? id;
	}

	// The two the boxes are about get a full-width link each; the other two are a
	// quieter row underneath, since nobody is being asked to agree to them.
	$: secondary = LEGAL_DOCUMENTS.filter(
		(id) => id !== LegalDocumentId.Terms && id !== LegalDocumentId.Privacy
	);
</script>

<div class={classNames('flex flex-col gap-3', classes)}>
	<div class="flex flex-col gap-1">
		<span class="text-sm font-semibold">{$_('legal.consent.heading')}</span>
		<p class="text-xs text-base-content/60">{$_('legal.consent.intro')}</p>
	</div>

	<label class="flex cursor-pointer items-start gap-3">
		<input
			type="checkbox"
			class="checkbox checkbox-sm mt-0.5 flex-none"
			bind:checked={ageConfirmed}
			{disabled}
		/>
		<span class="flex flex-col gap-0.5">
			<span class="text-sm">
				{$_('legal.consent.age', { values: { age: MINIMUM_AGE } })}
			</span>
			<span class="text-xs text-base-content/50">
				{$_('legal.consent.ageHint', { values: { age: MINIMUM_AGE } })}
			</span>
		</span>
	</label>

	<label class="flex cursor-pointer items-start gap-3">
		<input
			type="checkbox"
			class="checkbox checkbox-sm mt-0.5 flex-none"
			bind:checked={accepted}
			{disabled}
		/>
		<span class="text-sm">{$_('legal.consent.accept')}</span>
	</label>

	<!-- The way to actually read what is being accepted. Buttons rather than anchors:
		there is no page to navigate to — the documents are a sheet over this one, and the
		ticks above have to survive being read. -->
	<div class="flex flex-wrap gap-x-4 gap-y-1 text-xs">
		<button
			type="button"
			class="link link-primary"
			on:click={() => openLegalDocument(LegalDocumentId.Terms)}
		>
			{$_('legal.consent.readTerms')}
		</button>
		<button
			type="button"
			class="link link-primary"
			on:click={() => openLegalDocument(LegalDocumentId.Privacy)}
		>
			{$_('legal.consent.readPrivacy')}
		</button>
	</div>

	<div class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-base-content/50">
		{#each secondary as id (id)}
			<button type="button" class="link" on:click={() => openLegalDocument(id)}>
				{titleOf(id)}
			</button>
		{/each}
	</div>

	{#if showRequired && !(ageConfirmed && accepted)}
		<p class="text-xs text-error">{$_('legal.consent.required')}</p>
	{/if}
</div>
