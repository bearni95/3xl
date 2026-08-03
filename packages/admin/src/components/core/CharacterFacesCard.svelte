<script lang="ts">
	import classNames from 'classnames';
	import { onMount } from 'svelte';
	import type { CharacterOption } from '@3xl/data';
	import FaceCropEditor from '$components/core/FaceCropEditor.svelte';
	import type { CharacterDefinition, FaceCrop } from '$types/character-definition.type';
	import { clampFaceCrop, defaultFaceCrop, sameFaceCrop } from '$utils/mugen/face-crop';
	import { isVideoFile, videoFrameDataUrl, videoStillName } from '$utils/image/video-frame';
	import type { ManifestFace } from '$utils/mugen/mugen-player';

	// The character whose portraits this card lists — the group-9000 sprites its
	// archive shipped, plus any uploaded here.
	export let character: CharacterOption;
	export let classes: string = '';

	// Writes go through @3xl/backend (default :2002), which owns the git tree.
	// Reads take the static copy the app already serves at /data: a plain read of a
	// file in the tree needn't go through the write API.
	const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:2002';

	let definition: CharacterDefinition | null = null;
	// Every portrait the character has (manifest.faces — decoded and uploaded alike)
	// plus the manifest default, what the board falls back to when nothing is picked.
	let faces: ManifestFace[] = [];
	let defaultFace: string | null = null;
	// The picked file, editable until saved. Empty string means "not loaded yet".
	let picked: string | null = null;
	// The square framed on the picked face, in that sprite's pixels — what the
	// frontend's avatar picker and account card show. Null until a face with
	// known dimensions is active.
	let cropped: FaceCrop | null = null;
	let loading = true;
	let loadError = '';
	let saving = false;
	let saveError = '';
	let uploading = false;

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
			// Reactive statements haven't run for this load yet, so resolve the
			// active face here rather than reading `saved`.
			const file = picked || defaultFace;
			cropped = storedCrop(faces.find((face) => face.file === file) ?? null, file, definition);
		} catch (error) {
			loadError = error instanceof Error ? error.message : String(error);
		} finally {
			loading = false;
		}
	}

	// What the board would show right now: the explicit pick, or the manifest
	// default when none is chosen.
	$: activeFile = picked || defaultFace;
	// Its manifest entry, whose pixel size is the coordinate space of the crop.
	$: activeFace = faces.find((face) => face.file === activeFile) ?? null;
	// The square the active face starts on, named as a dependency so it re-derives
	// whenever the manifest lands or another portrait is picked.
	$: saved = storedCrop(activeFace, activeFile, definition);
	$: dirty =
		definition !== null && (picked !== (definition.face ?? null) || !sameFaceCrop(cropped, saved));

	/**
	 * The saved crop, as it applies to the face currently active: the definition's
	 * own square while its face is the one picked, and a fresh default square the
	 * moment another face is (a crop is in its sprite's pixels, so it can't follow
	 * a pick to a differently-sized portrait).
	 */
	function storedCrop(
		face: ManifestFace | null,
		file: string | null,
		def: CharacterDefinition | null
	): FaceCrop | null {
		if (!face) return null;
		const stored = def?.face === file ? def?.faceCrop : null;
		return clampFaceCrop(stored ?? defaultFaceCrop(face.width, face.height), face.width, face.height);
	}

	// A portrait's human label. Decoded sprites go by their group-9000 image number:
	// 0 the small select avatar, 1 the large versus portrait, higher numbers
	// character-specific alternates. An uploaded one has no number to go by.
	function faceLabel(face: ManifestFace): string {
		if (face.custom) return 'Uploaded';
		if (face.image === 0) return 'Avatar';
		if (face.image === 1) return 'Face';
		return `Alt ${face.image ?? '?'}`;
	}

	function pick(file: string) {
		picked = file;
		// The square is in the old sprite's pixels; re-frame it on the new one.
		cropped = storedCrop(faces.find((face) => face.file === file) ?? null, file, definition);
	}

	function recrop(crop: FaceCrop) {
		cropped = crop;
	}

	/** The picked file as the data URL the upload API takes. */
	function readDataUrl(file: File): Promise<string> {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = () => resolve(String(reader.result));
			reader.onerror = () => reject(reader.error ?? new Error('Could not read the file'));
			reader.readAsDataURL(file);
		});
	}

	/**
	 * Upload an image as a portrait for this character. The backend stores it beside
	 * the definition (where the next MUGEN import cannot delete it), copies it into
	 * the frames folder and picks it — so what comes back is a face like any other,
	 * already selected, framed on the default square until someone drags it.
	 *
	 * A video is taken a still out of first: the portrait store holds images it can
	 * measure by their own header, and the browser is the only thing here that can
	 * decode a clip — so a `.webm` becomes the PNG of its first frame *before* it is
	 * sent, and the API is handed the same thing a picked PNG would hand it.
	 */
	async function upload(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		// Clear the input either way, so the same file can be picked again after a
		// failure (a re-pick of an unchanged value fires no change event).
		input.value = '';
		if (!file || uploading || !definition) return;
		uploading = true;
		saveError = '';
		try {
			const video = isVideoFile(file);
			const filename = video ? videoStillName(file.name) : file.name;
			const data = video ? await videoFrameDataUrl(file) : await readDataUrl(file);
			const res = await fetch(`${API_BASE}/api/characters/${character.id}/faces`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ filename, data })
			});
			if (!res.ok) {
				const failure = await res.json().catch(() => ({ message: res.statusText }));
				throw new Error(failure.message ?? 'Upload failed');
			}
			const result = (await res.json()) as {
				definition: CharacterDefinition;
				face: ManifestFace;
				faces: ManifestFace[];
			};
			definition = result.definition;
			faces = result.faces;
			picked = definition.face ?? null;
			cropped = storedCrop(result.face, picked, definition);
		} catch (error) {
			saveError = error instanceof Error ? error.message : String(error);
		} finally {
			uploading = false;
		}
	}

	async function save() {
		// Framing the manifest default without picking another portrait is a valid
		// edit — saving then writes that default down as the explicit face.
		if (!definition || !activeFile || !dirty || saving) return;
		saving = true;
		saveError = '';
		try {
			const body: CharacterDefinition = { ...definition, face: activeFile };
			if (cropped) body.faceCrop = cropped;
			else delete body.faceCrop;
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
			cropped = storedCrop(activeFace, definition.face ?? null, definition);
		} catch (error) {
			saveError = error instanceof Error ? error.message : String(error);
		} finally {
			saving = false;
		}
	}

	// The whole card is one character's, on that character's own page, so it lays
	// itself out down the page rather than as a row in a list.
	$: cardClasses = classNames('flex flex-col gap-4', classes);
</script>

<div class={cardClasses}>
	{#if saveError}
		<div class="alert alert-error">
			<span>{saveError}</span>
		</div>
	{/if}

	{#if loading}
		<div class="flex items-center gap-2 opacity-70">
			<span class="loading loading-spinner loading-sm"></span>
			<span>Loading portraits…</span>
		</div>
	{:else if loadError}
		<div class="alert alert-warning">
			<span>{loadError}</span>
		</div>
	{:else}
		<div class="flex flex-wrap items-end gap-2">
			{#if faces.length === 0}
				<span class="self-center text-xs opacity-60">No group-9000 portraits</span>
			{/if}
			{#each faces as face (face.file)}
				{@const selected = activeFile === face.file}
				<button
					type="button"
					class={classNames('flex flex-col items-center gap-1 rounded-box border-2 p-1 transition', {
						'border-primary ring-2 ring-primary': selected,
						'border-transparent hover:border-base-300': !selected
					})}
					title={`${faceLabel(face)} — ${face.width}×${face.height}`}
					on:click={() => pick(face.file)}
				>
					<img
						src={`${character.basePath}/${face.file}`}
						alt={`${faceLabel(face)} portrait`}
						class="h-40 w-40 bg-base-300 object-contain"
					/>
					<span class="text-[10px] leading-none opacity-60">
						{faceLabel(face)}{face.file === defaultFace ? ' · default' : ''}
					</span>
				</button>
			{/each}

			<!-- One more portrait, from a file instead of the archive: it is stored,
			     copied in beside the decoded sprites and picked, all by the upload. A
			     video is offered too, and arrives as the PNG of its first frame. -->
			<label
				class={classNames(
					'flex flex-col items-center gap-1 rounded-box border-2 border-transparent p-1 transition',
					uploading ? 'pointer-events-none opacity-60' : 'cursor-pointer hover:border-base-300'
				)}
				title="Upload a portrait for this character"
			>
				<span
					class="flex h-40 w-40 items-center justify-center rounded-box border-2 border-dashed border-base-300 bg-base-200"
				>
					{#if uploading}
						<span class="loading loading-spinner loading-sm"></span>
					{:else}
						<span class="text-3xl leading-none opacity-50">+</span>
					{/if}
				</span>
				<span class="text-[10px] leading-none opacity-60">Upload</span>
				<input
					type="file"
					class="hidden"
					accept="image/png,image/jpeg,image/webp,image/gif,video/webm"
					disabled={uploading}
					on:change={upload}
				/>
			</label>
		</div>

		<div class="flex flex-wrap items-end gap-4">
			{#if activeFace && cropped}
				<FaceCropEditor
					src={`${character.basePath}/${activeFile}`}
					width={activeFace.width}
					height={activeFace.height}
					crop={cropped}
					on:change={(event) => recrop(event.detail)}
				/>
			{/if}

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
		</div>
	{/if}
</div>
