<script lang="ts">
	import { page } from '$app/stores';
	import { characters } from '@3xl/data';
	import MugenFrameSheet from '$components/core/MugenFrameSheet.svelte';
	import { characterDetail, deleteCharacterFrame } from '$services/characterDetail.service';
	import type { FrameCell } from '$utils/mugen/mugen-frame-sheet';

	// The frame sheet reads the decoded manifest itself, so this view needs nothing
	// but the character's asset folder.
	$: character = characters.find((c) => c.id === $page.params.id);

	// Held so a landed deletion can ask the sheet to redraw itself.
	let sheet: MugenFrameSheet | undefined;

	async function handleDelete(event: CustomEvent<FrameCell>): Promise<void> {
		if (!character) return;
		const { animation, index } = event.detail;
		if (!(await deleteCharacterFrame(character.id, animation, index))) return;
		// The manifest on disk is the sheet's only source, so it re-reads it: one
		// frame fewer moves every cell after it and can resize the whole row.
		await sheet?.reload();
	}
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
				frames laid out beside it. Each frame's corner button removes it from the decoded manifest.
			</p>
			{#if $characterDetail.saveError}
				<div class="alert alert-error">
					<span>{$characterDetail.saveError}</span>
				</div>
			{/if}
			<!-- Remount on character change so Pixi tears down and reloads cleanly. -->
			{#key character.id}
				<MugenFrameSheet
					bind:this={sheet}
					basePath={character.basePath}
					deletable
					disabled={$characterDetail.saving}
					on:delete={handleDelete}
				/>
			{/key}
		</div>
	</section>
{/if}
