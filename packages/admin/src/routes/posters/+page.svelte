<script lang="ts">
	import { characters } from '@3xl/data';
	import MugenPosterGrid from '$components/core/MugenPosterGrid.svelte';
	import type { PosterGridStatus } from '$utils/mugen/mugen-poster-grid';

	// The whole roster, idling side by side, drawn the way the combat board draws it:
	// one shared source→screen ratio per cell box, each character's own `renderScale`
	// on top of it, and the crown shift that stands it by its head. Which is what makes
	// the screen worth having — a correction can only be judged against the others.
	const roster = characters.map(({ id, basePath }) => ({ id, basePath }));

	let status: PosterGridStatus = {
		drawn: 0,
		total: roster.length,
		missing: [],
		loading: true
	};
</script>

<div class="flex-1 bg-base-200 p-6 md:p-10">
	<div class="mx-auto flex max-w-7xl flex-col gap-6">
		<header class="flex flex-col gap-2">
			<div class="flex items-center gap-3">
				<h1 class="text-3xl font-bold">Posters</h1>
				<span class="badge badge-neutral">
					{status.drawn}/{status.total}
					{status.loading ? 'loading' : 'drawn'}
				</span>
			</div>
			<p class="text-sm opacity-70">
				Every imported character's idle animation on one canvas, sized exactly as the game's
				combat board sizes it — the shared fit, the character's own
				<code class="font-mono">renderScale</code>, and the crown alignment that stands it by its
				head. They stand on the board's own hex field, wound out from the middle in registry
				order, each on its cell's foot line, so heights compare across the wall. The three
				blue cells at the middle are kept clear; the red line halves the field.
			</p>
			<div class="flex flex-wrap gap-4 text-sm">
				<a class="link link-primary" href="/characters">Characters →</a>
				<a class="link link-primary" href="/">← Back to stage</a>
			</div>
		</header>

		{#if status.missing.length > 0}
			<div class="alert alert-warning">
				<span>
					No idle animation loaded for: {status.missing.join(', ')}
				</span>
			</div>
		{/if}

		<MugenPosterGrid
			characters={roster}
			on:status={(event) => (status = event.detail)}
			classes="bg-base-300"
		/>
	</div>
</div>
