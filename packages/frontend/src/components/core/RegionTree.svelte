<script lang="ts">
	import classNames from 'classnames';
	import type {
		RegionComarca,
		RegionTerritory
	} from '$utils/geo/region-tree';

	// The territory → comarca → municipality tree, mirroring the map's red /
	// green / blue tiers.
	export let territories: RegionTerritory[] = [];
	// Municipality id to highlight (the one the player stands in), painted red
	// like its polygon; the branches leading to it are expanded on change.
	export let highlightId: string | null = null;

	// Which branches are open, keyed by the ids we mint below. UI-only state.
	let openTerritories = new Set<string>();
	let openComarques = new Set<string>();

	function comarcaKey(territory: RegionTerritory, comarca: RegionComarca): string {
		return `${territory.id}/${comarca.id}`;
	}

	function toggle(set: Set<string>, key: string): Set<string> {
		if (set.has(key)) set.delete(key);
		else set.add(key);
		// Reassign so Svelte tracks the change.
		return new Set(set);
	}

	function toggleTerritory(territory: RegionTerritory) {
		openTerritories = toggle(openTerritories, territory.id);
	}

	function toggleComarca(territory: RegionTerritory, comarca: RegionComarca) {
		openComarques = toggle(openComarques, comarcaKey(territory, comarca));
	}

	// Auto-open the branches down to the highlighted municipality so the player's
	// town is revealed whenever a new reading resolves.
	$: if (highlightId) revealHighlight(highlightId);

	function revealHighlight(id: string) {
		for (const territory of territories) {
			for (const comarca of territory.comarques) {
				if (comarca.municipis.some((m) => m.id === id)) {
					openTerritories = new Set(openTerritories).add(territory.id);
					openComarques = new Set(openComarques).add(comarcaKey(territory, comarca));
					return;
				}
			}
			if (territory.municipis.some((m) => m.id === id)) {
				openTerritories = new Set(openTerritories).add(territory.id);
				return;
			}
		}
	}
</script>

<ul class="menu min-h-0 flex-1 flex-nowrap gap-1 overflow-y-auto p-2">
	{#each territories as territory (territory.id)}
		{@const open = openTerritories.has(territory.id)}
		<li>
			<button
				type="button"
				class="flex items-center gap-2 border-l-4 border-error font-semibold"
				aria-expanded={open}
				on:click={() => toggleTerritory(territory)}
			>
				<span class={classNames('text-xs transition-transform', { 'rotate-90': open })}>▶</span>
				<span class="flex-1 truncate text-left">{territory.name}</span>
				<span class="badge badge-error badge-sm">{territory.count}</span>
			</button>

			{#if open}
				<ul class="border-l border-error/30">
					{#each territory.comarques as comarca (comarca.id)}
						{@const comarcaOpen = openComarques.has(comarcaKey(territory, comarca))}
						<li>
							<button
								type="button"
								class="flex items-center gap-2 border-l-4 border-success"
								aria-expanded={comarcaOpen}
								on:click={() => toggleComarca(territory, comarca)}
							>
								<span
									class={classNames('text-xs transition-transform', { 'rotate-90': comarcaOpen })}
								>▶</span>
								<span class="flex-1 truncate text-left">{comarca.name}</span>
								<span class="badge badge-success badge-sm">{comarca.municipis.length}</span>
							</button>

							{#if comarcaOpen}
								<ul class="border-l border-success/30">
									{#each comarca.municipis as municipality (municipality.id)}
										<li>
											<span
												class={classNames('flex items-center gap-2 border-l-4 border-info', {
													'bg-error/20 font-semibold': highlightId === municipality.id
												})}
											>
												<span class="h-2 w-2 flex-none rounded-full bg-info"></span>
												<span class="flex-1 truncate">{municipality.name}</span>
											</span>
										</li>
									{/each}
								</ul>
							{/if}
						</li>
					{/each}

					{#each territory.municipis as municipality (municipality.id)}
						<li>
							<span
								class={classNames('flex items-center gap-2 border-l-4 border-info', {
									'bg-error/20 font-semibold': highlightId === municipality.id
								})}
							>
								<span class="h-2 w-2 flex-none rounded-full bg-info"></span>
								<span class="flex-1 truncate">{municipality.name}</span>
							</span>
						</li>
					{/each}
				</ul>
			{/if}
		</li>
	{:else}
		<li class="px-2 py-4 text-sm opacity-60">No regions loaded.</li>
	{/each}
</ul>
