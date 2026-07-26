<script lang="ts">
	import classNames from 'classnames';
	import { createEventDispatcher } from 'svelte';
	import MugenAnimationPreview from '$components/core/MugenAnimationPreview.svelte';
	import type { CharacterOption } from '@3xl/data';
	import {
		DEFAULT_RARITY,
		RARITY_MIN,
		type CharacterTemplateStatus
	} from '$types/character-template.type';
	import { wowRarityLabel } from '$utils/rarity/wow-rarity';

	// The character read/write API is served by @3xl/backend (default :2002).
	const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:2002';

	// The character this card represents, and whether it's the active selection.
	export let character: CharacterOption;
	export let selected: boolean = false;
	// Supabase sync state for this character; `undefined` until the remote
	// templates have loaded (no badge shown while unknown).
	export let syncStatus: CharacterTemplateStatus | undefined = undefined;
	// This character's persisted Supabase rarity tier — the baseline the editor
	// seeds from. `undefined` until the remote templates have loaded.
	export let rarity: number | undefined = undefined;

	const dispatch = createEventDispatcher<{
		select: CharacterOption;
		// Emitted after a rarity edit is persisted, so the page can keep its map current.
		raritysaved: { id: string; rarity: number };
	}>();

	const statusBadge: Record<CharacterTemplateStatus, string> = {
		synced: 'badge-success',
		missing: 'badge-warning',
		mismatch: 'badge-info',
		orphan: 'badge-error'
	};
	const statusLabel: Record<CharacterTemplateStatus, string> = {
		synced: 'Synced',
		missing: 'Not synced',
		mismatch: 'Name differs',
		orphan: 'Orphan'
	};

	// Editable rarity draft. Re-seed from the persisted baseline whenever it loads
	// or changes, but never while an edit of this card is in flight, so a save's
	// echo (or an unrelated re-render) can't clobber an in-progress edit.
	let draft = DEFAULT_RARITY;
	let baseline = DEFAULT_RARITY;
	let saving = false;
	let error = '';
	$: if (!saving && rarity !== undefined && rarity !== baseline) {
		baseline = rarity;
		draft = rarity;
	}
	$: dirty = draft !== baseline;

	// WoW quality name for the value currently in the editor (null when the value
	// is above the highest WoW tier — then no label shows). Data lives in
	// @3xl/shared; the per-tier colour is a UI concern, so it's mapped here.
	$: rarityLabel = wowRarityLabel(typeof draft === 'number' ? draft : DEFAULT_RARITY);
	const rarityBadgeClass: Record<number, string> = {
		0: 'badge-ghost',
		1: 'badge-neutral',
		2: 'badge-success',
		3: 'badge-info',
		4: 'badge-secondary',
		5: 'badge-warning',
		6: 'badge-warning',
		7: 'badge-info'
	};

	$: cardClasses = classNames(
		'card relative items-center gap-2 border-2 bg-base-100 p-3 shadow-md transition',
		{
			'border-primary ring-2 ring-primary': selected,
			'border-transparent hover:border-base-300 hover:shadow-lg': !selected
		}
	);

	function handleSelect() {
		dispatch('select', character);
	}

	async function saveRarity() {
		saving = true;
		error = '';
		try {
			const res = await fetch(`${API_BASE}/api/character-templates/${character.id}/rarity`, {
				method: 'PUT',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ rarity: draft })
			});
			if (!res.ok) {
				const body = await res.json().catch(() => ({ message: res.statusText }));
				throw new Error(body.message ?? `Failed to save rarity (${res.status})`);
			}
			const { template } = (await res.json()) as { template: { rarity?: number } };
			baseline = template.rarity ?? DEFAULT_RARITY;
			draft = baseline;
			dispatch('raritysaved', { id: character.id, rarity: baseline });
		} catch (err) {
			error = err instanceof Error ? err.message : String(err);
		} finally {
			saving = false;
		}
	}
</script>

<div class={cardClasses}>
	{#if syncStatus}
		<span class={classNames('badge badge-sm absolute right-2 top-2', statusBadge[syncStatus])}>
			{statusLabel[syncStatus]}
		</span>
	{/if}

	<button type="button" class="flex flex-col items-center gap-2" on:click={handleSelect}>
		<!-- Every character's idle animation is keyed `idle` in its manifest. -->
		<MugenAnimationPreview basePath={character.basePath} animation="idle" />
		<span class="max-w-[180px] truncate text-center text-sm font-medium">{character.label}</span>
	</button>

	<!-- Supabase rarity editor. Lives on the card so each character's tier can be
	     set inline; kept out of the select button so editing never changes the
	     active character. -->
	<div class="flex w-full flex-wrap items-center gap-1">
		<span class="text-xs opacity-60">Rarity</span>
		<input
			type="number"
			class="input input-bordered input-xs w-16"
			min={RARITY_MIN}
			step="1"
			bind:value={draft}
			disabled={saving || rarity === undefined}
		/>
		{#if rarityLabel}
			<span
				class={classNames(
					'badge badge-sm',
					rarityBadgeClass[typeof draft === 'number' ? draft : DEFAULT_RARITY] ?? 'badge-ghost'
				)}
			>
				{rarityLabel}
			</span>
		{/if}
		<button
			class="btn btn-secondary btn-xs ml-auto"
			type="button"
			on:click={saveRarity}
			disabled={saving || rarity === undefined || !dirty}
		>
			{#if saving}
				<span class="loading loading-spinner loading-xs"></span>
			{:else}
				Save
			{/if}
		</button>
	</div>
	{#if error}
		<span class="w-full text-xs text-error">{error}</span>
	{/if}
</div>
