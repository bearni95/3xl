<script lang="ts">
	import classNames from 'classnames';
	import MugenStage from '$components/core/MugenStage.svelte';
	import { characters, defaultCharacterId } from '$data/characters';

	let selectedId = defaultCharacterId;

	$: selected = characters.find((character) => character.id === selectedId) ?? characters[0];
</script>

<div class="flex min-h-screen flex-col items-center justify-center gap-6 bg-base-200 p-8">
	<h1 class="text-3xl font-bold">Welcome to SvelteKit</h1>
	<div class="card bg-base-100 shadow-xl">
		<div class="card-body items-center gap-3">
			<div class="tabs tabs-boxed">
				{#each characters as character (character.id)}
					<button
						class={classNames('tab', { 'tab-active': character.id === selectedId })}
						on:click={() => (selectedId = character.id)}
					>
						{character.label}
					</button>
				{/each}
			</div>

			<!-- Remount the stage when the character changes so Pixi tears down and
			     reloads the new character's frames cleanly. -->
			{#key selected.id}
				<MugenStage basePath={selected.basePath} width={640} height={360} scale={2.5} />
			{/key}

			<div class="flex flex-col items-center gap-1 text-sm">
				<div class="flex items-center gap-2">
					<span>Move</span>
					<kbd class="kbd kbd-sm">←</kbd>
					<kbd class="kbd kbd-sm">→</kbd>
					<span>Jump</span>
					<kbd class="kbd kbd-sm">↑</kbd>
					<kbd class="kbd kbd-sm">space</kbd>
				</div>
				<span class="opacity-70">double-tap to run</span>
			</div>
			<span class="text-xs opacity-60">{selected.label} — MUGEN sprite</span>
		</div>
	</div>
	<a class="link link-primary text-sm" href="/admin/characters">View character frames →</a>
	<p class="text-sm opacity-70">
		Visit
		<a class="link link-primary" href="https://svelte.dev/docs/kit">svelte.dev/docs/kit</a>
		to read the documentation
	</p>
</div>
