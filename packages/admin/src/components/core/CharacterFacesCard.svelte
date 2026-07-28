<script lang="ts">
	import classNames from 'classnames';
	import { onMount } from 'svelte';
	import type { CharacterOption } from '@3xl/data';
	import type { CharacterDefinition } from '$types/character-definition.type';
	import type { ManifestFace } from '$utils/mugen/mugen-player';

	// The character whose group-9000 portraits this card lists.
	export let character: CharacterOption;
	export let classes: string = '';

	// Writes go through @3xl/backend (default :2002), which owns the git tree.
	// Reads take the static copy the app already serves at /data — the faces page
	// mounts one card per character, so a same-origin file read keeps the whole
	// grid off the write API.
	const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:2002';

	let definition: CharacterDefinition | null = null;
	// Every portrait the character ships (manifest.faces) plus the manifest
	// default — what the board falls back to when the definition picks none.
	let faces: ManifestFace[] = [];
	let defaultFace: string | null = null;
	// The picked file, editable until saved. Empty string means "not loaded yet".
	let picked: string | null = null;
	let loading = true;
	let loadError = '';
	let saving = false;
	let saveError = '';

	onMount(load);

	async function load() {
		loading = true;
		loadError = '';
		try {
			const [defRes, manifestRes] = await Promise.all([
				fetch(`/data/characters/${character.id}/definition.json`),
				fetch(`${character.basePath}/manifest.json`)
			]);
			if (!defRes.ok) throw new Error(`Failed to load definition (${defRes.status})`);
			definition = (await defRes.json()) as CharacterDefinition;
			picked = definition.face ?? null;
			if (manifestRes.ok) {
				const manifest = await manifestRes.json();
				faces = manifest.faces ?? [];
				defaultFace = manifest.face?.file ?? null;
			}
		} catch (error) {
			loadError = error instanceof Error ? error.message : String(error);
		} finally {
			loading = false;
		}
	}

	// What the board would show right now: the explicit pick, or the manifest
	// default when none is chosen.
	$: activeFile = picked || defaultFace;
	$: dirty = definition !== null && picked !== (definition.face ?? null);

	// A group-9000 image number to a human label: 0 the small select avatar, 1 the
	// large versus portrait, higher numbers character-specific alternates.
	function faceLabel(image: number | undefined): string {
		if (image === 0) return 'Avatar';
		if (image === 1) return 'Face';
		return `Alt ${image ?? '?'}`;
	}

	function pick(file: string) {
		picked = file;
	}

	async function save() {
		if (!definition || !picked || !dirty || saving) return;
		saving = true;
		saveError = '';
		try {
			const body: CharacterDefinition = { ...definition, face: picked };
			const res = await fetch(`${API_BASE}/api/characters/${character.id}`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(body)
			});
			if (!res.ok) {
				const failure = await res.json().catch(() => ({ message: res.statusText }));
				throw new Error(failure.message ?? 'Save failed');
			}
			definition = (await res.json()) as CharacterDefinition;
			picked = definition.face ?? null;
		} catch (error) {
			saveError = error instanceof Error ? error.message : String(error);
		} finally {
			saving = false;
		}
	}

	$: cardClasses = classNames(
		'card flex-row items-center gap-4 bg-base-100 p-3 shadow-md',
		classes
	);
</script>

<div class={cardClasses}>
	<div class="flex w-40 shrink-0 flex-col gap-1">
		<span class="truncate text-sm font-medium" title={character.label}>{character.label}</span>
		{#if saveError}
			<span class="text-xs text-error">{saveError}</span>
		{/if}
	</div>

	{#if loading}
		<div class="flex flex-1 items-center gap-2 opacity-70">
			<span class="loading loading-spinner loading-sm"></span>
		</div>
	{:else if loadError}
		<span class="flex-1 text-xs text-error">{loadError}</span>
	{:else if faces.length === 0}
		<span class="flex-1 text-xs opacity-60">No group-9000 portraits</span>
	{:else}
		<div class="flex flex-1 flex-wrap items-end gap-2">
			{#each faces as face (face.file)}
				{@const selected = activeFile === face.file}
				<button
					type="button"
					class={classNames('flex flex-col items-center gap-1 rounded-box border-2 p-1 transition', {
						'border-primary ring-2 ring-primary': selected,
						'border-transparent hover:border-base-300': !selected
					})}
					title={`${faceLabel(face.image)} — ${face.width}×${face.height}`}
					on:click={() => pick(face.file)}
				>
					<img
						src={`${character.basePath}/${face.file}`}
						alt={`${faceLabel(face.image)} portrait`}
						class="h-40 w-40 bg-base-300 object-contain"
					/>
					<span class="text-[10px] leading-none opacity-60">
						{faceLabel(face.image)}{face.file === defaultFace ? ' · default' : ''}
					</span>
				</button>
			{/each}
		</div>

		<button
			class="btn btn-secondary btn-sm shrink-0"
			type="button"
			disabled={!dirty || saving}
			on:click={save}
		>
			{#if saving}
				<span class="loading loading-spinner loading-xs"></span>
			{:else}
				Save
			{/if}
		</button>
	{/if}
</div>
