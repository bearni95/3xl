<script lang="ts">
	import CharacterDashboardTable from '$components/core/CharacterDashboardTable.svelte';
	import { characters } from '@3xl/data';
</script>

<div class="flex-1 bg-base-200 p-6 md:p-10">
	<div class="mx-auto flex max-w-6xl flex-col gap-6">
		<header class="flex flex-col gap-2">
			<div class="flex items-center gap-3">
				<h1 class="text-3xl font-bold">Character dashboard</h1>
				<span class="badge badge-neutral">{characters.length} characters</span>
			</div>
			<p class="text-sm opacity-70">
				Every character in one table — the sprite the grid shows, its name, the show it belongs to
				and its rarity tier. Each field saves itself as it is changed: a name lands in the
				character's definition JSON, the generated registry and Supabase; a show and a rarity live
				only in Supabase.
			</p>
			<a class="link link-primary text-sm" href="/characters">← Back to character frames</a>
		</header>

		<section class="card bg-base-100 shadow-xl">
			<div class="card-body gap-4">
				<CharacterDashboardTable {characters} />
			</div>
		</section>
	</div>
</div>
