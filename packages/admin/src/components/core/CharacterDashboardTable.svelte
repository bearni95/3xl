<script lang="ts">
	import { onMount } from 'svelte';
	import MugenAnimationPreview from '$components/core/MugenAnimationPreview.svelte';
	import RarityBadge from '$components/core/RarityBadge.svelte';
	import type { CharacterOption } from '@3xl/data';
	import { DEFAULT_RARITY, type CharacterTemplate } from '$types/character-template.type';
	import type { ShowCharacterAssignments, ShowTemplate } from '$types/show-template.type';

	// Everything this table adds to the registry — which show claims a character
	// and its rarity tier — lives only in Supabase, read through @3xl/backend
	// (default :2002): the same endpoints the /characters grid reads.
	const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:2002';

	// The full character list to lay out, one row each.
	export let characters: CharacterOption[] = [];

	let rarityById = new Map<string, number>();
	let assignments: ShowCharacterAssignments = {};
	let showTemplates: ShowTemplate[] = [];
	let loading = false;
	let loadError = '';

	onMount(load);

	async function load() {
		loading = true;
		loadError = '';
		try {
			const [templatesRes, assignRes, showsRes] = await Promise.all([
				fetch(`${API_BASE}/api/character-templates`),
				fetch(`${API_BASE}/api/show-templates/assignments`),
				fetch(`${API_BASE}/api/show-templates`)
			]);
			if (!templatesRes.ok) throw new Error(`Failed to load templates (${templatesRes.status})`);
			if (!assignRes.ok) throw new Error(`Failed to load assignments (${assignRes.status})`);
			if (!showsRes.ok) throw new Error(`Failed to load shows (${showsRes.status})`);
			const { templates } = (await templatesRes.json()) as { templates: CharacterTemplate[] };
			rarityById = new Map(templates.map((t) => [t.id, t.rarity ?? DEFAULT_RARITY]));
			assignments = ((await assignRes.json()) as { assignments: ShowCharacterAssignments })
				.assignments;
			showTemplates = ((await showsRes.json()) as { templates: ShowTemplate[] }).templates;
		} catch (err) {
			loadError = err instanceof Error ? err.message : String(err);
		} finally {
			loading = false;
		}
	}

	// Invert the show→characters map to characterId→showId. Each character
	// belongs to a single show, so the first show that claims it wins.
	$: showIdByCharacter = buildShowIdByCharacter(assignments);
	$: showNameById = new Map(showTemplates.map((t) => [t.id, t.name]));

	function buildShowIdByCharacter(map: ShowCharacterAssignments): Map<string, number> {
		const result = new Map<string, number>();
		for (const [showId, characterIds] of Object.entries(map)) {
			const numericShowId = Number(showId);
			for (const characterId of characterIds) {
				if (!result.has(characterId)) result.set(characterId, numericShowId);
			}
		}
		return result;
	}

	/** One table row: a character with the show and rarity it reads as. */
	interface Row {
		character: CharacterOption;
		showName: string;
		rarity: number;
	}

	// Ordered exactly as the /characters grid orders its sections and cards — by
	// show name, characters with no show last, and by rarity (highest first)
	// inside each show — so the same table reads as that grid unrolled.
	$: rows = buildRows(characters, showIdByCharacter, showNameById, rarityById);

	function buildRows(
		all: CharacterOption[],
		showByCharacter: Map<string, number>,
		names: Map<number, string>,
		rarities: Map<string, number>
	): Row[] {
		return all
			.map((character) => {
				const showId = showByCharacter.get(character.id);
				return {
					character,
					showName: showId === undefined ? '' : (names.get(showId) ?? `Show ${showId}`),
					rarity: rarities.get(character.id) ?? DEFAULT_RARITY
				};
			})
			.sort((a, b) => {
				// An empty show name sorts last rather than first: it is "no show",
				// not a name that happens to precede every other one.
				if (a.showName !== b.showName) {
					if (!a.showName) return 1;
					if (!b.showName) return -1;
					return a.showName.localeCompare(b.showName);
				}
				return b.rarity - a.rarity;
			});
	}
</script>

{#if loadError}
	<div class="alert alert-warning">
		<span>{loadError}</span>
	</div>
{:else if loading}
	<div class="flex items-center gap-2 opacity-70">
		<span class="loading loading-spinner loading-sm"></span>
		<span>Loading characters…</span>
	</div>
{/if}

<div class="overflow-x-auto">
	<table class="table table-zebra">
		<thead>
			<tr>
				<th class="w-20"></th>
				<th>Character</th>
				<th>Show</th>
				<th>Rarity</th>
			</tr>
		</thead>
		<tbody>
			{#each rows as row (row.character.id)}
				<tr>
					<td>
						<!-- Every character's idle animation is keyed `idle` in its manifest. -->
						<MugenAnimationPreview
							basePath={row.character.basePath}
							animation="idle"
							size="h-16 w-16"
						/>
					</td>
					<td>
						<div class="font-medium">{row.character.label}</div>
						<div class="font-mono text-xs opacity-60">{row.character.id}</div>
					</td>
					<td>
						{#if row.showName}
							{row.showName}
						{:else}
							<span class="opacity-50">Unassigned</span>
						{/if}
					</td>
					<td>
						<div class="flex items-center gap-2">
							<span class="font-mono text-sm">{row.rarity}</span>
							<RarityBadge rarity={row.rarity} />
						</div>
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
