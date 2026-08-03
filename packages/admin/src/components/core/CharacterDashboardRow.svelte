<script lang="ts">
	import classNames from 'classnames';
	import { onMount } from 'svelte';
	import MugenAnimationPreview from '$components/core/MugenAnimationPreview.svelte';
	import RarityBadge from '$components/core/RarityBadge.svelte';
	import CharacterFace from '$sharedComponents/CharacterFace.svelte';
	import { characterFace, type CharacterFace as Face } from '$utils/mugen/character-face';
	import type { CharacterOption } from '@3xl/data';
	import {
		LABEL_MAX_LENGTH,
		type CharacterDefinition
	} from '$types/character-definition.type';
	import {
		definitionAnimations,
		type DefinitionAnimation
	} from '$utils/mugen/definition-animations';
	import { DEFAULT_RARITY, RARITY_MIN } from '$types/character-template.type';
	import type { ShowTemplate } from '$types/show-template.type';

	// Each field autosaves against @3xl/backend (default :2002), which owns where
	// the value actually lives: a name is written to the character's definition
	// JSON, the generated registry and Supabase; a show and a rarity are Supabase
	// only.
	const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:2002';

	// The character this row is, seeded with the show it belongs to and its rarity
	// tier, plus the shows it can be moved to.
	export let character: CharacterOption;
	export let showId: number | null = null;
	export let rarity: number = DEFAULT_RARITY;
	export let shows: ShowTemplate[] = [];

	// The detail views a character is authored through, each its own route under
	// this dashboard — the same list, in the same order, as that character's tabs.
	const views = [
		{ segment: 'definition', label: 'Definition' },
		{ segment: 'stats', label: 'Stats' },
		{ segment: 'faces', label: 'Faces' },
		{ segment: 'frames', label: 'Frames' },
		{ segment: 'imported', label: 'Imported' }
	];

	// Editable drafts. Re-seeded from the props whenever they change, but never
	// while a save of that field is in flight, so the save's echo (or an unrelated
	// re-render) can't clobber what is being typed.
	let nameDraft = character.label;
	let nameBaseline = character.label;
	let showDraft: number | null = showId;
	let showBaseline: number | null = showId;
	let rarityDraft: number = rarity;
	let rarityBaseline: number = rarity;

	let savingName = false;
	let savingShow = false;
	let savingRarity = false;
	let nameError = '';
	let showError = '';
	let rarityError = '';

	$: if (!savingName && character.label !== nameBaseline) {
		nameBaseline = character.label;
		nameDraft = character.label;
	}
	$: if (!savingShow && showId !== showBaseline) {
		showBaseline = showId;
		showDraft = showId;
	}
	$: if (!savingRarity && rarity !== rarityBaseline) {
		rarityBaseline = rarity;
		rarityDraft = rarity;
	}

	// A show this character is assigned to that the local collection no longer
	// holds still has to be an option, or the select would read as unassigned.
	$: options =
		showBaseline !== null && !shows.some((show) => show.id === showBaseline)
			? [...shows, { id: showBaseline, name: `Show ${showBaseline}` }]
			: shows;

	// Which animations this row previews is the character's own definition to say —
	// the poses and directions it binds plus a move per entry it declares — so a
	// character with no ranged move shows one preview fewer rather than a gap.
	//
	// Read straight off the definition JSON committed in @3xl/data, which this app's
	// vite serves at /data: it is a plain read of a file in the tree, so it needn't
	// go through the backend the way this row's writes do. Note that the definition's
	// own `basePath` is legacy and does not match where the frames are actually
	// served — previews use the registry's.
	//
	// Until it has loaded (and if it cannot be read) the row stands on the idle alone,
	// which is what this cell showed before and is keyed `idle` in every manifest.
	const IDLE_ONLY: DefinitionAnimation[] = [{ label: 'idle', source: 'idle' }];
	let bound: DefinitionAnimation[] | null = null;
	$: previews = bound ?? IDLE_ONLY;

	// The portrait picked (and framed) on this character's Faces page, drawn by the
	// very component the game draws a profile picture with — so the square authored
	// there is judged here as the player will see it, and not as a second guess at it.
	let face: Face | null = null;

	onMount(async () => {
		try {
			const res = await fetch(`/data/characters/${character.id}/definition.json`);
			if (!res.ok) return;
			bound = definitionAnimations((await res.json()) as CharacterDefinition);
		} catch {
			// A definition that cannot be read costs the row its extra previews, not
			// the fields it exists to edit.
		}
	});

	onMount(async () => {
		try {
			face = await characterFace(character.id, character.basePath);
		} catch {
			// A character with no readable portrait shows none; the row is unaffected.
		}
	});

	/** Message out of a failed save response, preferring the API's own. */
	async function failure(res: Response, fallback: string): Promise<string> {
		const body = (await res.json().catch(() => ({}))) as { message?: string };
		return body.message ?? `${fallback} (${res.status})`;
	}

	// Committed on change (blur or Enter), not on every keystroke: a rename is
	// three writes, and a half-typed name is not one anybody meant to make.
	async function saveName() {
		const label = nameDraft.trim();
		if (!label || label === nameBaseline) {
			nameDraft = nameBaseline;
			nameError = '';
			return;
		}
		savingName = true;
		nameError = '';
		try {
			const res = await fetch(`${API_BASE}/api/characters/${character.id}/label`, {
				method: 'PUT',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ label })
			});
			if (!res.ok) throw new Error(await failure(res, 'Failed to save name'));
			nameBaseline = label;
			nameDraft = label;
		} catch (err) {
			nameError = err instanceof Error ? err.message : String(err);
		} finally {
			savingName = false;
		}
	}

	async function saveShow(event: Event) {
		const raw = (event.currentTarget as HTMLSelectElement).value;
		const next = raw === '' ? null : Number(raw);
		showDraft = next;
		if (next === showBaseline) return;
		savingShow = true;
		showError = '';
		try {
			const res = await fetch(`${API_BASE}/api/show-templates/assignments/${character.id}`, {
				method: 'PUT',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ showId: next })
			});
			if (!res.ok) throw new Error(await failure(res, 'Failed to save show'));
			showBaseline = next;
		} catch (err) {
			showError = err instanceof Error ? err.message : String(err);
			// Put the select back on the show the character is actually in.
			showDraft = showBaseline;
		} finally {
			savingShow = false;
		}
	}

	async function saveRarity() {
		const value = typeof rarityDraft === 'number' ? Math.max(RARITY_MIN, rarityDraft) : DEFAULT_RARITY;
		rarityDraft = value;
		if (value === rarityBaseline) return;
		savingRarity = true;
		rarityError = '';
		try {
			const res = await fetch(`${API_BASE}/api/character-templates/${character.id}/rarity`, {
				method: 'PUT',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ rarity: value })
			});
			if (!res.ok) throw new Error(await failure(res, 'Failed to save rarity'));
			const { template } = (await res.json()) as { template: { rarity?: number } };
			rarityBaseline = template.rarity ?? value;
			rarityDraft = rarityBaseline;
		} catch (err) {
			rarityError = err instanceof Error ? err.message : String(err);
			rarityDraft = rarityBaseline;
		} finally {
			savingRarity = false;
		}
	}
</script>

<tr>
	<td>
		<!-- Two previews abreast, in columns as wide as a preview is, so the portrait
		     over them can span both and be exactly the width of what it heads. -->
		<div class="grid grid-cols-[repeat(2,4rem)] gap-2">
			{#if face}
				<div class="col-span-2 aspect-square w-full rounded-md bg-base-300">
					<CharacterFace {face} alt={`${character.label} portrait`} />
				</div>
			{/if}
			{#each previews as preview (`${preview.label}:${preview.source}`)}
				<div class="flex w-16 flex-col items-center gap-0.5">
					<MugenAnimationPreview
						basePath={character.basePath}
						animation={preview.source}
						size="h-16 w-16"
					/>
					<!-- Names which animation this is, since several of them are the same
					     character doing different things. The full name stays reachable on
					     hover for a move whose own name is longer than the box. -->
					<span class="w-full truncate text-center text-xs leading-tight opacity-60" title={preview.label}>
						{preview.label}
					</span>
				</div>
			{/each}
		</div>
	</td>
	<td>
		<div class="flex items-center gap-2">
			<input
				type="text"
				class={classNames('input input-bordered input-sm w-full max-w-[15rem]', {
					'input-error': nameError
				})}
				maxlength={LABEL_MAX_LENGTH}
				bind:value={nameDraft}
				disabled={savingName}
				on:change={saveName}
			/>
			{#if savingName}
				<span class="loading loading-spinner loading-xs"></span>
			{/if}
		</div>
		<div class="font-mono text-xs opacity-60">{character.id}</div>
		{#if nameError}
			<div class="text-xs text-error">{nameError}</div>
		{/if}
	</td>
	<td>
		<div class="flex items-center gap-2">
			<select
				class={classNames('select select-bordered select-sm w-full max-w-[15rem]', {
					'select-error': showError
				})}
				value={showDraft === null ? '' : String(showDraft)}
				disabled={savingShow}
				on:change={saveShow}
			>
				<option value="">Unassigned</option>
				{#each options as show (show.id)}
					<option value={String(show.id)}>{show.name}</option>
				{/each}
			</select>
			{#if savingShow}
				<span class="loading loading-spinner loading-xs"></span>
			{/if}
		</div>
		{#if showError}
			<div class="text-xs text-error">{showError}</div>
		{/if}
	</td>
	<td>
		<div class="flex items-center gap-2">
			<input
				type="number"
				class={classNames('input input-bordered input-sm w-20', { 'input-error': rarityError })}
				min={RARITY_MIN}
				step="1"
				bind:value={rarityDraft}
				disabled={savingRarity}
				on:change={saveRarity}
			/>
			<RarityBadge rarity={rarityDraft} />
			{#if savingRarity}
				<span class="loading loading-spinner loading-xs"></span>
			{/if}
		</div>
		{#if rarityError}
			<div class="text-xs text-error">{rarityError}</div>
		{/if}
	</td>
	<td>
		<div class="join">
			{#each views as view (view.segment)}
				<a class="btn btn-outline btn-xs join-item" href={`/characters/dashboard/${character.id}/${view.segment}`}>
					{view.label}
				</a>
			{/each}
		</div>
	</td>
</tr>
