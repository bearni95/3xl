<script lang="ts">
	import ClaimPackGrid from './ClaimPackGrid.svelte';
	import type { OpenerPack } from './scene/opener-view.type';

	// The day's booster packs, one per celebrating place with a seeded show.
	export let packs: OpenerPack[] = [];

	let grid: ClaimPackGrid;
	// The pack currently being opened (set when one is picked), or null while the
	// grid of choices is shown. Drives the header and the "back to packs" control.
	let selected: OpenerPack | null = null;
	// Bumped to remount the grid — on "back to packs", so a fresh, full grid rebuilds.
	let gridSession = 0;

	// Remount the grid whenever the set of packs changes (a new day / shows loading),
	// so a stale grid never lingers. Closures change on every recompute, but the ids
	// are stable, so key on the ids only.
	$: packsKey = packs.map((pack) => pack.id).join(',');

	// Pick a pack by id — forwarded from the DOM festes list so a list click opens the
	// same pack on the canvas (centre + zoom + cut).
	export function selectPack(id: string): void {
		grid?.selectPack(id);
	}

	function backToPacks(): void {
		selected = null;
		gridSession += 1;
	}
</script>

<div class="card h-full min-h-[32rem] w-full bg-base-100 shadow-xl">
	<div class="card-body gap-4 p-4">
		<div class="flex shrink-0 items-center justify-between gap-3">
			<div>
				<h2 class="text-lg font-bold">
					{selected ? selected.label : "Sobres de festa d'avui"}
				</h2>
				<p class="text-xs opacity-60">
					{#if selected}
						Click anywhere along the pack to slice it open
					{:else}
						Pick a pack to zoom in and slice it open
					{/if}
				</p>
			</div>
			{#if selected}
				<button type="button" class="btn btn-sm btn-ghost" on:click={backToPacks}>
					Back to packs
				</button>
			{/if}
		</div>

		<div class="min-h-0 flex-1 rounded-md bg-gradient-to-b from-base-300/80 to-base-200">
			{#if packs.length}
				{#key `${packsKey}:${gridSession}`}
					<ClaimPackGrid
						bind:this={grid}
						{packs}
						on:select={(event) => (selected = event.detail)}
					/>
				{/key}
			{:else}
				<div class="flex h-full items-center justify-center p-6 text-center">
					<p class="max-w-xs text-sm opacity-60">
						No booster packs to open right now. Sign in and pick a town celebrating its festa
						major today.
					</p>
				</div>
			{/if}
		</div>
	</div>
</div>
