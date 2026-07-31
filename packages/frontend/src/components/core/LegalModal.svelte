<script lang="ts">
	import classNames from 'classnames';
	import { _, json } from 'svelte-i18n';
	import FullScreenModal from '$components/core/FullScreenModal.svelte';
	import LegalDocument from '$components/core/LegalDocument.svelte';
	import { closeLegalDocument, legalModalDocument } from '$services/legalModal';
	import { LEGAL_DOCUMENTS, type LegalDocumentId } from '$types/legal.type';

	// The four documents, on the same full-view sheet the roster and the leaderboard are
	// drawn on — because they are the same kind of thing: a page of content laid over the
	// map, read for as long as it is being read and then put away.
	//
	// All four on one sheet with a tab each, rather than four ways in. A player who has
	// opened the terms because a checkbox asked them to is one keystroke from the privacy
	// notice, which is the document the terms keep pointing at; splitting them would have
	// meant closing one sheet to open the next. The store carries *which* one, so every
	// entrance lands on the document it named (see `$services/legalModal`).
	//
	// The tabs are the document titles read straight out of the catalogue, so a tab can
	// never say something different from the heading it leads to.

	$: current = $legalModalDocument;

	/** A tab's label: the document's own title, from the catalogue. */
	function titleOf(id: LegalDocumentId): string {
		const content = $json(`legal.documents.${id}`) as { title?: string } | null;
		return content?.title ?? id;
	}
</script>

{#if current}
	<FullScreenModal
		title={$_('legal.title')}
		closeLabel={$_('legal.close')}
		on:close={closeLegalDocument}
	>
		<!-- role="tablist" and nothing more: DaisyUI's `tab` classes carry the look, and
			which panel is shown is the store rather than an aria-controls target, because
			only one panel is ever mounted. -->
		<div role="tablist" class="tabs-boxed tabs flex-none justify-start overflow-x-auto">
			{#each LEGAL_DOCUMENTS as id (id)}
				<button
					type="button"
					role="tab"
					aria-selected={current === id}
					class={classNames('tab whitespace-nowrap', { 'tab-active': current === id })}
					on:click={() => legalModalDocument.set(id)}
				>
					{titleOf(id)}
				</button>
			{/each}
		</div>

		<!-- The document scrolls inside the sheet rather than the sheet scrolling, so the
			tabs stay put however far down a clause sits. Capped in width because a line of
			prose the width of a monitor is a line nobody finishes. -->
		<div class="min-h-0 flex-1 overflow-y-auto rounded-box bg-base-200/40 p-6">
			{#key current}
				<LegalDocument document={current} classes="mx-auto max-w-3xl" />
			{/key}
		</div>
	</FullScreenModal>
{/if}
