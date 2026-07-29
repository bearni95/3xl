<script lang="ts">
	import classNames from 'classnames';
	import MugenAnimationPreview from '$components/core/MugenAnimationPreview.svelte';
	import RarityBadge from '$components/core/RarityBadge.svelte';
	import type { CharacterOption } from '@3xl/data';
	import { LABEL_MAX_LENGTH } from '$types/character-definition.type';
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
		<!-- Every character's idle animation is keyed `idle` in its manifest. -->
		<MugenAnimationPreview basePath={character.basePath} animation="idle" size="h-16 w-16" />
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
</tr>
