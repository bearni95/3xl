<script lang="ts">
	import { page } from '$app/stores';
	import { characters } from '@3xl/data';
	import MugenImportedMoves from '$components/core/MugenImportedMoves.svelte';
	import { characterDetail } from '$services/characterDetail.service';

	$: id = $page.params.id ?? '';
	$: character = characters.find((c) => c.id === id);
	// Only read the state once it belongs to the character in the URL, so the
	// previous character's moveset is never shown under this one's name.
	$: moveset = $characterDetail.id === id ? $characterDetail.moveset : null;
</script>

<section class="card bg-base-100 shadow-xl">
	<div class="card-body gap-4">
		<div class="flex flex-wrap items-center gap-3">
			<h2 class="card-title">Imported moves</h2>
			<span class="badge badge-ghost font-mono text-xs">
				/data/characters/{id}/mugen-moves.json
			</span>
		</div>
		<p class="text-sm opacity-70">
			The raw MUGEN moveset extracted at import time from the character's .cmd and state files —
			every command-triggered state with its input, damage and animation. Read-only.
		</p>

		{#if $characterDetail.loadError}
			<div class="alert alert-error">
				<span>{$characterDetail.loadError}</span>
			</div>
		{:else if moveset && character}
			{#key id}
				<MugenImportedMoves {moveset} basePath={character.basePath} />
			{/key}
		{:else if $characterDetail.definition === null}
			<!-- Still loading: an absent moveset only means "none on disk" once the
			     load that would have brought it has finished. -->
			<div class="flex items-center gap-2 opacity-70">
				<span class="loading loading-spinner loading-sm"></span>
				<span>Loading imported moves…</span>
			</div>
		{:else}
			<div class="alert alert-info">
				<span>
					No imported move data for this character — re-run
					<code class="font-mono">pnpm import:mugen {id}</code> to extract it.
				</span>
			</div>
		{/if}
	</div>
</section>
