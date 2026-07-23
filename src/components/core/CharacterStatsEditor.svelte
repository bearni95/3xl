<script lang="ts">
	import classNames from 'classnames';
	import { createEventDispatcher } from 'svelte';
	import {
		STAT_KINDS,
		STAT_MIN,
		STAT_MAX,
		DEFAULT_STAT,
		type CharacterDefinition,
		type StatKind
	} from '$types/character-definition.type';

	// The definition being edited. Stats share the same JSON + write API as the
	// rest of the definition, so saving dispatches the full merged object.
	export let definition: CharacterDefinition;
	// Save feedback, driven by the parent while the POST is in flight.
	export let saving: boolean = false;
	export let errorMessage: string = '';
	export let classes: string = '';

	const dispatch = createEventDispatcher<{ save: CharacterDefinition }>();

	// Human-readable labels for each stat slot.
	const statLabels: Record<StatKind, string> = {
		atk: 'Attack',
		def: 'Defense',
		hp: 'Health'
	};

	// Editable draft. Re-clone only when a new definition loads so in-progress
	// edits aren't clobbered by unrelated re-renders. Definitions authored before
	// stats existed get DEFAULT_STAT so the sliders always have a value.
	let draft: CharacterDefinition;
	let loaded: CharacterDefinition | null = null;
	$: if (definition && definition !== loaded) {
		loaded = definition;
		draft = structuredClone(definition);
		const stats = { ...(draft.stats ?? ({} as CharacterDefinition['stats'])) };
		for (const kind of STAT_KINDS) {
			stats[kind] = typeof stats[kind] === 'number' ? stats[kind] : DEFAULT_STAT;
		}
		draft.stats = stats;
	}

	$: dirty = draft && JSON.stringify(draft) !== JSON.stringify(definition);

	function save() {
		if (draft && dirty && !saving) dispatch('save', structuredClone(draft));
	}

	$: wrapperClasses = classNames('flex flex-col gap-6', classes);
</script>

{#if draft}
	<div class={wrapperClasses}>
		<section class="flex flex-col gap-4">
			<h3 class="text-lg font-semibold">Stats</h3>
			<p class="text-sm opacity-70">
				Core gameplay stats, each from {STAT_MIN} to {STAT_MAX}.
			</p>

			<div class="flex flex-col gap-6">
				{#each STAT_KINDS as kind (kind)}
					<label class="form-control gap-1">
						<div class="flex items-center justify-between">
							<span class="label-text font-medium">{statLabels[kind]}</span>
							<span class="badge badge-primary badge-lg font-mono">{draft.stats[kind]}</span>
						</div>
						<input
							type="range"
							class="range range-primary"
							min={STAT_MIN}
							max={STAT_MAX}
							step="1"
							bind:value={draft.stats[kind]}
						/>
						<div class="flex justify-between px-1 text-xs opacity-50">
							<span>{STAT_MIN}</span>
							<span>{STAT_MAX}</span>
						</div>
					</label>
				{/each}
			</div>
		</section>

		<div class="flex items-center gap-3">
			<button
				class={classNames('btn btn-primary btn-sm', { loading: saving })}
				disabled={!dirty || saving}
				on:click={save}
			>
				{saving ? 'Saving…' : 'Save stats'}
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
