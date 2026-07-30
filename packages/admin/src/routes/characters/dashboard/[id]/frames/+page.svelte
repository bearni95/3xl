<script lang="ts">
	import { page } from '$app/stores';
	import { characters } from '@3xl/data';
	import MugenFrameSheet from '$components/core/MugenFrameSheet.svelte';

	// The frame sheet reads the decoded manifest itself, so this view needs nothing
	// but the character's asset folder.
	$: character = characters.find((c) => c.id === $page.params.id);
</script>

{#if character}
	<section class="card bg-base-100 shadow-xl">
		<div class="card-body gap-4">
			<div class="flex flex-wrap items-center gap-3">
				<h2 class="card-title">Frames</h2>
				<span class="badge badge-ghost font-mono text-xs">{character.basePath}</span>
			</div>
			<p class="text-sm opacity-70">
				Every animation this character defines, looping live on a PixiJS canvas with its static
				frames laid out beside it.
			</p>
			<!-- Remount on character change so Pixi tears down and reloads cleanly. -->
			{#key character.id}
				<MugenFrameSheet basePath={character.basePath} />
			{/key}
		</div>
	</section>
{/if}
