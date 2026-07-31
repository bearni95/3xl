<script lang="ts">
	import classNames from 'classnames';
	import { _, json } from 'svelte-i18n';
	import { LEGAL_VERSIONS, LegalDocumentId } from '$types/legal.type';

	// One legal document, read out of the catalogue.
	//
	// The prose is in ca.json like every other word the player reads — a document
	// nobody can read in the game's own language is not published — but it is read
	// through `json` rather than through `_`. Two reasons, and both matter here.
	// `_` formats: it is ICU, so an apostrophe before a brace and a stray `{` in a
	// paragraph would both change what comes out, and legal text is the one text
	// that must arrive exactly as it was written. And a document is a *shape* —
	// headings with paragraphs under them — not a string, and `json` hands the shape
	// over whole instead of making the component guess how many paragraphs a section
	// has.
	//
	// The version is not read from the catalogue: it comes from LEGAL_VERSIONS, the
	// same constant the acceptance is recorded against. If the printed date and the
	// recorded version could come from two places they could disagree, and then a
	// player would have accepted something other than what they were shown.

	// Props
	export let document: LegalDocumentId;
	export let classes: string = '';

	/** A document as the catalogue holds it. */
	interface LegalDocumentContent {
		title: string;
		summary: string;
		sections: { heading: string; body: string[] }[];
	}

	// The identity block belongs to the two documents that are *about* a relationship
	// with somebody: the contract you are entering and the controller processing your
	// data. The storage note and the credits name no counterparty, so repeating an
	// address on them would only be furniture.
	$: showsPublisher =
		document === LegalDocumentId.Terms || document === LegalDocumentId.Privacy;

	$: content = ($json(`legal.documents.${document}`) ?? null) as LegalDocumentContent | null;
	$: sections = content?.sections ?? [];
</script>

<article class={classNames('flex flex-col gap-6 text-sm leading-relaxed', classes)}>
	<header class="flex flex-col gap-2">
		<h3 class="text-2xl font-bold">{content?.title ?? ''}</h3>
		{#if content?.summary}
			<p class="text-base-content/70">{content.summary}</p>
		{/if}
		<p class="text-xs text-base-content/50">
			{$_('legal.updated', { values: { version: LEGAL_VERSIONS[document] } })}
		</p>
	</header>

	{#if showsPublisher}
		<!-- Who is on the other side of this. It is the same block on both documents
			because it answers the same question on both, and it is drawn from one place
			in the catalogue so an address corrected once is corrected everywhere. -->
		<section class="rounded-box border border-base-300 bg-base-200/40 p-4">
			<h4 class="mb-3 font-semibold">{$_('legal.publisher.heading')}</h4>
			<dl class="grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-[auto_1fr]">
				<dt class="text-base-content/60">{$_('legal.publisher.nameLabel')}</dt>
				<dd>{$_('legal.publisher.name')}</dd>
				<dt class="text-base-content/60">{$_('legal.publisher.addressLabel')}</dt>
				<dd>{$_('legal.publisher.address')}</dd>
				<dt class="text-base-content/60">{$_('legal.publisher.taxIdLabel')}</dt>
				<dd>{$_('legal.publisher.taxId')}</dd>
				<dt class="text-base-content/60">{$_('legal.publisher.emailLabel')}</dt>
				<dd>{$_('legal.publisher.email')}</dd>
			</dl>
			<p class="mt-3 text-xs text-base-content/50">{$_('legal.publisher.note')}</p>
		</section>
	{/if}

	{#each sections as section (section.heading)}
		<section class="flex flex-col gap-2">
			<h4 class="font-semibold">{section.heading}</h4>
			{#each section.body as paragraph, index (index)}
				<p class="text-base-content/80">{paragraph}</p>
			{/each}
		</section>
	{/each}
</article>
