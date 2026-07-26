<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { characters } from '@3xl/data';
	import {
		SpawnColor,
		SPAWN_STAT_MAX,
		SPAWN_STAT_MIN,
		DEFAULT_SPAWN_STAT,
		type CharacterSpawn
	} from '$types/character-spawn.type';
	import { resolveCharacterFaceUrl } from '$utils/mugen/character-face';
	import { renderCardGif } from '$components/core/pack/scene/card-gif';
	import type { ClaimPull } from '$components/core/pack/scene/pull.type';

	// Hidden host for the offscreen render canvas — the card is drawn here and
	// captured to a GIF; nothing of the canvas itself is shown.
	let host: HTMLDivElement;
	let gifUrl = '';
	let error = '';
	let loading = true;

	const charactersById = new Map(characters.map((character) => [character.id, character]));

	function parseColor(value: string | null): SpawnColor {
		const values = Object.values(SpawnColor) as string[];
		return (value && values.includes(value) ? value : SpawnColor.Red) as SpawnColor;
	}

	function parseStat(value: string | null): number {
		const n = Number(value);
		if (!Number.isFinite(n)) return DEFAULT_SPAWN_STAT;
		return Math.max(SPAWN_STAT_MIN, Math.min(SPAWN_STAT_MAX, Math.round(n)));
	}

	function parseRarity(value: string | null): number | null {
		if (value == null || value === '') return null;
		const n = Number(value);
		return Number.isInteger(n) && n >= 0 ? n : null;
	}

	onMount(async () => {
		try {
			const params = new URL(window.location.href).searchParams;
			const id = params.get('id');
			const character = id ? charactersById.get(id) : undefined;
			if (!id || !character) {
				error = 'Unknown or missing card id.';
				return;
			}

			const basePath = character.basePath ?? null;
			const faceUrl = basePath
				? await resolveCharacterFaceUrl(id, basePath).catch(() => null)
				: null;
			const color = parseColor(params.get('color'));
			const atk = parseStat(params.get('stat'));
			const rarity = parseRarity(params.get('rarity'));
			const locationName = params.get('loc');

			// The card only needs the fields RevealCardSprite reads; a synthetic spawn
			// satisfies the ClaimPull shape for this read-only preview.
			const spawn: CharacterSpawn = {
				id: 'preview',
				userId: '',
				characterId: id,
				showId: null,
				locationId: locationName ?? '',
				color,
				stat: atk,
				createdAt: new Date().toISOString()
			};
			const pull: ClaimPull = {
				spawn,
				label: character.label ?? id,
				basePath,
				faceUrl,
				color,
				rarity,
				locationName: locationName || null,
				atk,
				def: SPAWN_STAT_MAX - atk
			};

			const blob = await renderCardGif(pull, { host });
			gifUrl = URL.createObjectURL(blob);
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
		} finally {
			loading = false;
		}
	});

	onDestroy(() => {
		if (gifUrl) URL.revokeObjectURL(gifUrl);
	});
</script>

<svelte:head>
	<title>Card</title>
</svelte:head>

<div class="flex min-h-screen items-center justify-center bg-base-200 p-4">
	{#if loading}
		<span class="loading loading-spinner loading-lg"></span>
	{:else if error}
		<div class="alert alert-error max-w-sm text-sm"><span>{error}</span></div>
	{:else if gifUrl}
		<!-- The exported animated GIF of the card. -->
		<img src={gifUrl} alt="Card" class="h-auto max-h-[90vh] w-auto rounded-lg shadow-xl" />
	{/if}

	<!-- Hidden render host: the card renders into an offscreen canvas here. -->
	<div bind:this={host} class="hidden" aria-hidden="true"></div>
</div>
