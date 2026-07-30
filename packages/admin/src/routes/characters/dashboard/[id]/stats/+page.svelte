<script lang="ts">
	import { page } from '$app/stores';
	import CharacterStatsEditor from '$components/core/CharacterStatsEditor.svelte';
	import { characterDetail, saveCharacterDefinition } from '$services/characterDetail.service';

	$: id = $page.params.id ?? '';
	// Only read the state once it belongs to the character in the URL, so the
	// previous character's stats are never shown under this one's name.
	$: definition = $characterDetail.id === id ? $characterDetail.definition : null;
</script>

<section class="card bg-base-100 shadow-xl">
	<div class="card-body gap-4">
		<div class="flex flex-wrap items-center gap-3">
			<h2 class="card-title">Stats</h2>
			<span class="badge badge-ghost font-mono text-xs">
				/data/characters/{id}/definition.json
			</span>
		</div>
		<p class="text-sm opacity-70">
			Tune this character's core gameplay stats and save straight into the git tree.
		</p>

		{#if $characterDetail.loadError}
			<div class="alert alert-error">
				<span>{$characterDetail.loadError}</span>
			</div>
		{:else if definition}
			{#key definition.id}
				<CharacterStatsEditor
					{definition}
					saving={$characterDetail.saving}
					errorMessage={$characterDetail.saveError}
					on:save={(event) => saveCharacterDefinition(event.detail)}
				/>
			{/key}
		{:else}
			<div class="flex items-center gap-2 opacity-70">
				<span class="loading loading-spinner loading-sm"></span>
				<span>Loading definition…</span>
			</div>
		{/if}
	</div>
</section>
