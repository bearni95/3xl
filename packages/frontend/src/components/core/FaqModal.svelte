<script lang="ts">
	import { _, json } from 'svelte-i18n';
	import FullScreenModal from '$components/core/FullScreenModal.svelte';
	import { closeFaq } from '$services/faqModal';

	// What the game gets asked, on the same full-view sheet the roster, the album and the
	// legal documents are drawn on — because it is the same kind of thing: a page of
	// content laid over the map, read for as long as it is being read and then put away.
	//
	// The questions are content, so all of them are in the catalogue and none of them are
	// here: `faq.entries` is the whole list, and a question is added by writing it there.
	// They are read through the `json` store rather than `_` for the same two reasons the
	// legal documents are — a list of pairs is a shape rather than a string, and `_` is
	// ICU, where a stray brace in an answer would change what the reader is shown.

	interface FaqEntry {
		question: string;
		answer: string;
	}

	$: entries = ($json('faq.entries') as FaqEntry[] | null) ?? [];
</script>

<FullScreenModal title={$_('faq.title')} closeLabel={$_('faq.close')} on:close={closeFaq}>
	<!-- The questions scroll inside the sheet rather than the sheet scrolling, so the title
		bar stays put however far down the list an answer sits. Capped in width because a
		line of prose the width of a monitor is a line nobody finishes. -->
	<div class="min-h-0 flex-1 overflow-y-auto rounded-box bg-base-200/40 p-6">
		<div class="mx-auto flex max-w-3xl flex-col gap-6">
			{#each entries as entry, index (index)}
				<div class="flex flex-col gap-1">
					<h3 class="text-base font-bold">{entry.question}</h3>
					<p class="whitespace-pre-line opacity-80">{entry.answer}</p>
				</div>
			{/each}
		</div>
	</div>
</FullScreenModal>
