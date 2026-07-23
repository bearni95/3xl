<script lang="ts">
	import classNames from 'classnames';
	import { createEventDispatcher } from 'svelte';
	import MugenAnimationPreview from '$components/core/MugenAnimationPreview.svelte';
	import {
		MOVEMENT_ANIMATIONS,
		DIRECTION_NAMES,
		MOVE_KINDS,
		PROJECTILE_MOVES,
		type CharacterDefinition,
		type CharacterMove
	} from '$types/character-definition.type';

	// The definition being edited and the raw manifest animation keys the user
	// can bind slots to. Both come from the parent (loaded via the API / manifest).
	export let definition: CharacterDefinition;
	export let availableAnimations: string[] = [];
	// Save feedback, driven by the parent while the POST is in flight.
	export let saving: boolean = false;
	export let errorMessage: string = '';
	export let classes: string = '';

	const dispatch = createEventDispatcher<{ save: CharacterDefinition }>();

	// Keep an editable draft; re-clone only when a new definition is loaded so the
	// user's in-progress edits aren't clobbered by unrelated re-renders.
	let draft: CharacterDefinition;
	let loaded: CharacterDefinition | null = null;
	$: if (definition && definition !== loaded) {
		loaded = definition;
		draft = structuredClone(definition);
	}

	$: dirty = draft && JSON.stringify(draft) !== JSON.stringify(definition);

	function save() {
		if (draft && dirty && !saving) dispatch('save', structuredClone(draft));
	}

	// Moves are a per-character list — each entry tags an animation with a shared
	// move type and names it. Reassign the array so Svelte picks up the change.
	function addMove() {
		draft.moves = [...draft.moves, { name: '', type: MOVE_KINDS[0], source: '' }];
	}

	function removeMove(index: number) {
		draft.moves = draft.moves.filter((_, i) => i !== index);
	}

	/** Keep the inline projectile binding in sync with the move's type tag. */
	function syncProjectile(move: CharacterMove) {
		if (PROJECTILE_MOVES.includes(move.type)) {
			move.projectile ??= { source: '', loop: true };
		} else {
			delete move.projectile;
		}
		draft.moves = [...draft.moves];
	}

	$: wrapperClasses = classNames('flex flex-col gap-6', classes);
</script>

{#if draft}
	<div class={wrapperClasses}>
		<section class="flex flex-col gap-3">
			<h3 class="text-lg font-semibold">Movement & directions</h3>
			<p class="text-sm opacity-70">
				The slots the game loop drives — the idle/jump/fall/hurt poses every character defines,
				alongside directional movement — each bound to a raw manifest animation, previewed live.
			</p>
			<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
				{#each MOVEMENT_ANIMATIONS as name (name)}
					<div class="card border border-base-300 bg-base-200">
						<div class="card-body gap-3 p-4">
							<div class="flex items-center justify-between">
								<span class="badge badge-info">{name}</span>
								<label class="label cursor-pointer gap-2 py-0">
									<span class="label-text text-xs">Loop</span>
									<input
										type="checkbox"
										class="checkbox checkbox-sm"
										bind:checked={draft.animations[name].loop}
									/>
								</label>
							</div>

							<label class="form-control">
								<span class="label-text text-xs">Animation</span>
								<select
									class="select select-bordered select-sm"
									bind:value={draft.animations[name].source}
								>
									<option value="">— unassigned —</option>
									{#each availableAnimations as anim (anim)}
										<option value={anim}>{anim}</option>
									{/each}
								</select>
							</label>

							<span class="label-text text-xs">Preview</span>
							<div class="flex justify-center">
								{#if draft.animations[name].source}
									{#key draft.animations[name].source}
										<MugenAnimationPreview
											basePath={definition.basePath}
											animation={draft.animations[name].source}
										/>
									{/key}
								{:else}
									<div
										class="flex h-[180px] w-[180px] items-center justify-center rounded-box bg-base-300 text-xs opacity-60"
									>
										No animation selected
									</div>
								{/if}
							</div>
						</div>
					</div>
				{/each}

				{#each DIRECTION_NAMES as name (name)}
					<div class="card border border-base-300 bg-base-200">
						<div class="card-body gap-3 p-4">
							<div class="flex items-center justify-between">
								<span class="badge badge-accent">{name}</span>
								<label class="label cursor-pointer gap-2 py-0">
									<span class="label-text text-xs">Loop</span>
									<input
										type="checkbox"
										class="checkbox checkbox-sm"
										bind:checked={draft.directions[name].loop}
									/>
								</label>
							</div>

							<label class="form-control">
								<span class="label-text text-xs">Animation</span>
								<select
									class="select select-bordered select-sm"
									bind:value={draft.directions[name].source}
								>
									<option value="">— unassigned —</option>
									{#each availableAnimations as anim (anim)}
										<option value={anim}>{anim}</option>
									{/each}
								</select>
							</label>

							<span class="label-text text-xs">Preview</span>
							<div class="flex justify-center">
								{#if draft.directions[name].source}
									{#key draft.directions[name].source}
										<MugenAnimationPreview
											basePath={definition.basePath}
											animation={draft.directions[name].source}
										/>
									{/key}
								{:else}
									<div
										class="flex h-[180px] w-[180px] items-center justify-center rounded-box bg-base-300 text-xs opacity-60"
									>
										No animation selected
									</div>
								{/if}
							</div>
						</div>
					</div>
				{/each}
			</div>
		</section>

		<section class="flex flex-col gap-3">
			<div class="flex items-center gap-3">
				<h3 class="text-lg font-semibold">Moves</h3>
				<button class="btn btn-outline btn-xs" on:click={addMove}>+ Add move</button>
			</div>
			<p class="text-sm opacity-70">
				This character's own moves — each links a raw animation to one of the shared move types and
				gets a name. Ranged and final moves also carry the projectile they fire.
			</p>
			{#if draft.moves.length === 0}
				<div class="rounded-box bg-base-200 p-6 text-center text-sm opacity-60">
					No moves defined yet — add one to get started.
				</div>
			{/if}
			<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
				{#each draft.moves as move, index (index)}
					<div class="card border border-base-300 bg-base-200">
						<div class="card-body gap-3 p-4">
							<div class="flex items-center justify-between">
								<span class="badge badge-primary">{move.type}</span>
								<button
									class="btn btn-ghost btn-xs text-error"
									title="Remove move"
									on:click={() => removeMove(index)}
								>
									✕
								</button>
							</div>

							<label class="form-control">
								<span class="label-text text-xs">Name</span>
								<input
									class="input input-bordered input-sm"
									type="text"
									placeholder="e.g. Kamehameha"
									bind:value={move.name}
								/>
							</label>

							<label class="form-control">
								<span class="label-text text-xs">Type</span>
								<select
									class="select select-bordered select-sm"
									bind:value={move.type}
									on:change={() => syncProjectile(move)}
								>
									{#each MOVE_KINDS as kind (kind)}
										<option value={kind}>{kind}</option>
									{/each}
								</select>
							</label>

							<label class="form-control">
								<span class="label-text text-xs">Animation</span>
								<select class="select select-bordered select-sm" bind:value={move.source}>
									<option value="">— unassigned —</option>
									{#each availableAnimations as anim (anim)}
										<option value={anim}>{anim}</option>
									{/each}
								</select>
							</label>

							<!-- Live preview of the animation bound to this move. Remount on
							     source change so the player reloads cleanly. -->
							<span class="label-text text-xs">Preview</span>
							<div class="flex justify-center">
								{#if move.source}
									{#key move.source}
										<MugenAnimationPreview
											basePath={definition.basePath}
											animation={move.source}
										/>
									{/key}
								{:else}
									<div
										class="flex h-[180px] w-[180px] items-center justify-center rounded-box bg-base-300 text-xs opacity-60"
									>
										No animation selected
									</div>
								{/if}
							</div>

							{#if move.projectile}
								<!-- The projectile pairs with its move (ranged / final), so it
								     lives right under it. -->
								<div class="divider my-1"></div>
								<div class="flex items-center justify-between">
									<span class="badge badge-secondary">projectile</span>
									<label class="label cursor-pointer gap-2 py-0">
										<span class="label-text text-xs">Loop</span>
										<input
											type="checkbox"
											class="checkbox checkbox-sm"
											bind:checked={move.projectile.loop}
										/>
									</label>
								</div>

								<label class="form-control">
									<span class="label-text text-xs">Animation</span>
									<select
										class="select select-bordered select-sm"
										bind:value={move.projectile.source}
									>
										<option value="">— unassigned —</option>
										{#each availableAnimations as anim (anim)}
											<option value={anim}>{anim}</option>
										{/each}
									</select>
								</label>

								<span class="label-text text-xs">Preview</span>
								<div class="flex justify-center">
									{#if move.projectile.source}
										{#key move.projectile.source}
											<MugenAnimationPreview
												basePath={definition.basePath}
												animation={move.projectile.source}
											/>
										{/key}
									{:else}
										<div
											class="flex h-[180px] w-[180px] items-center justify-center rounded-box bg-base-300 text-xs opacity-60"
										>
											No animation selected
										</div>
									{/if}
								</div>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		</section>

		<div class="flex items-center gap-3">
			<button
				class={classNames('btn btn-primary btn-sm', { loading: saving })}
				disabled={!dirty || saving}
				on:click={save}
			>
				{saving ? 'Saving…' : 'Save definition'}
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
