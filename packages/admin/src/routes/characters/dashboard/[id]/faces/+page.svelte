<script lang="ts">
	import { page } from '$app/stores';
	import { characters } from '@3xl/data';
	import CharacterFacesCard from '$components/core/CharacterFacesCard.svelte';

	// The card reads the definition and the decoded manifest itself, so this view
	// needs nothing but the character.
	$: character = characters.find((c) => c.id === $page.params.id);
</script>

{#if character}
	<section class="card bg-base-100 shadow-xl">
		<div class="card-body gap-4">
			<div class="flex flex-wrap items-center gap-3">
				<h2 class="card-title">Faces</h2>
				<span class="badge badge-ghost font-mono text-xs">{character.basePath}</span>
			</div>
			<p class="text-sm opacity-70">
				Every portrait this character ships in sprite group 9000, plus any image uploaded here. Pick
				which one the board shows, drag the square to frame the avatar the game wears, then save
				straight into the git tree.
			</p>
			<!-- Remount on character change: the card loads once, and moving between two
			     characters' faces pages keeps this route's components alive. -->
			{#key character.id}
				<CharacterFacesCard {character} />
			{/key}
		</div>
	</section>
{/if}
