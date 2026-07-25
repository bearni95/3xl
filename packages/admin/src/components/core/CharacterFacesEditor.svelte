<script lang="ts">
	import classNames from 'classnames';
	import { createEventDispatcher } from 'svelte';
	import type { CharacterDefinition } from '$types/character-definition.type';
	import type { ManifestFace } from '$utils/mugen/mugen-player';

	// The definition being edited. The chosen portrait shares the same JSON + write
	// API as the rest of the definition, so saving dispatches the full merged object.
	export let definition: CharacterDefinition;
	// Where the character's frame PNGs live, for resolving each portrait's src.
	export let basePath: string;
	// Every portrait the character ships (manifest.faces), in image-number order.
	export let faces: ManifestFace[] = [];
	// The manifest's default portrait file — what the board falls back to when the
	// definition selects none. Highlighted so the author sees the current default.
	export let defaultFace: string | null = null;
	// Save feedback, driven by the parent while the POST is in flight.
	export let saving: boolean = false;
	export let errorMessage: string = '';
	export let classes: string = '';

	const dispatch = createEventDispatcher<{ save: CharacterDefinition }>();

	// Editable draft. Re-clone only when a new definition loads so an in-progress
	// pick isn't clobbered by unrelated re-renders.
	let draft: CharacterDefinition;
	let loaded: CharacterDefinition | null = null;
	$: if (definition && definition !== loaded) {
		loaded = definition;
		draft = structuredClone(definition);
	}

	// The file the board would show right now for the draft: the explicit pick, or
	// the manifest default when none is chosen.
	$: activeFile = draft?.face || defaultFace;

	$: dirty = draft && JSON.stringify(draft) !== JSON.stringify(definition);

	// A group-9000 image number to a human label: 0 the small select avatar, 1 the
	// large versus portrait, higher numbers character-specific alternates.
	function faceLabel(image: number | undefined): string {
		if (image === 0) return 'Avatar';
		if (image === 1) return 'Face';
		return `Alt ${image ?? '?'}`;
	}

	function pick(file: string) {
		if (!draft) return;
		draft.face = file;
		draft = draft;
	}

	function save() {
		if (draft && dirty && !saving) dispatch('save', structuredClone(draft));
	}

	$: wrapperClasses = classNames('flex flex-col gap-6', classes);
</script>

{#if draft}
	<div class={wrapperClasses}>
		<section class="flex flex-col gap-4">
			<h3 class="text-lg font-semibold">Portrait</h3>
			<p class="text-sm opacity-70">
				Every face and avatar this character defines in MUGEN sprite group 9000. Pick the one the
				board shows for this character.
			</p>

			{#if faces.length === 0}
				<div class="alert alert-info">
					<span>This character ships no group-9000 portraits.</span>
				</div>
			{:else}
				<div class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
					{#each faces as face (face.file)}
						{@const selected = activeFile === face.file}
						<button
							type="button"
							class={classNames(
								'card cursor-pointer items-center gap-2 border-2 bg-base-200 p-3 transition',
								{
									'border-primary ring-2 ring-primary': selected,
									'border-transparent hover:border-base-300': !selected
								}
							)}
							on:click={() => pick(face.file)}
						>
							<img
								src={`${basePath}/${face.file}`}
								alt={`${faceLabel(face.image)} portrait`}
								class="h-28 w-28 bg-base-300 object-contain"
							/>
							<div class="flex flex-wrap items-center justify-center gap-1">
								<span class="badge badge-neutral badge-sm">{faceLabel(face.image)}</span>
								{#if face.file === defaultFace}
									<span class="badge badge-ghost badge-sm">default</span>
								{/if}
							</div>
							<span class="font-mono text-xs opacity-60">
								{face.width}×{face.height}
							</span>
						</button>
					{/each}
				</div>
			{/if}
		</section>

		<div class="flex items-center gap-3">
			<button
				class={classNames('btn btn-primary btn-sm', { loading: saving })}
				disabled={!dirty || saving || faces.length === 0}
				on:click={save}
			>
				{saving ? 'Saving…' : 'Save portrait'}
			</button>
			{#if dirty && !saving}
				<span class="text-sm opacity-70">Unsaved changes</span>
			{/if}
			{#if errorMessage}
				<span class="text-sm text-error">{errorMessage}</span>
			{/if}
		</div>
	</div>
{/if}
