<script lang="ts">
	import classNames from 'classnames';
	import { createEventDispatcher } from 'svelte';
	import MugenStage from '$components/core/MugenStage.svelte';
	import { TEAM_SIZE, type TeamMember } from '$services/team.service';

	// Presentational only — the parent owns the team service and applies changes.
	export let members: TeamMember[] = [];
	// Characters the player can pick from (deduplicated roster characters).
	export let options: { id: string; label: string; basePath: string | null }[] = [];

	const dispatch = createEventDispatcher<{
		select: { index: number; characterId: string | null };
		rename: { index: number; name: string };
		clear: { index: number };
	}>();

	// Character ids used in any slot, so the others can disable them (distinct team).
	$: chosen = new Set(
		members.map((member) => member.characterId).filter((id): id is string => Boolean(id))
	);
	$: filled = chosen.size;

	function basePathFor(characterId: string | null): string | null {
		if (!characterId) return null;
		return options.find((option) => option.id === characterId)?.basePath ?? null;
	}

	function handleSelect(index: number, event: Event): void {
		const value = (event.currentTarget as HTMLSelectElement).value;
		dispatch('select', { index, characterId: value || null });
	}

	function handleRename(index: number, event: Event): void {
		dispatch('rename', { index, name: (event.currentTarget as HTMLInputElement).value });
	}
</script>

<div class="card bg-base-100 shadow-md">
	<div class="card-body gap-4 p-4">
		<div class="flex items-center justify-between">
			<h2 class="card-title text-base">Your team</h2>
			<span class="badge badge-primary">{filled}/{TEAM_SIZE}</span>
		</div>
		<p class="text-xs opacity-60">Assemble three different characters and name each one.</p>

		<div class="flex flex-col gap-3">
			{#each members as member, index (index)}
				{@const basePath = basePathFor(member.characterId)}
				<div class="rounded-box flex gap-3 bg-base-200 p-3">
					<figure
						class="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded bg-base-300"
					>
						{#if basePath}
							<MugenStage {basePath} width={64} height={64} scale={0.5} />
						{:else}
							<span class="text-2xl opacity-40">{index + 1}</span>
						{/if}
					</figure>

					<div class="flex flex-1 flex-col gap-2">
						<select
							class="select select-bordered select-sm w-full"
							value={member.characterId ?? ''}
							on:change={(event) => handleSelect(index, event)}
						>
							<option value="">— Empty slot —</option>
							{#each options as option (option.id)}
								<option
									value={option.id}
									disabled={chosen.has(option.id) && member.characterId !== option.id}
								>
									{option.label}
								</option>
							{/each}
						</select>

						<div class="flex gap-2">
							<input
								class="input input-bordered input-sm w-full"
								type="text"
								placeholder="Optional name"
								value={member.name}
								disabled={!member.characterId}
								on:input={(event) => handleRename(index, event)}
							/>
							<button
								class={classNames('btn btn-ghost btn-sm btn-square', {
									'btn-disabled': !member.characterId && !member.name
								})}
								title="Clear slot"
								on:click={() => dispatch('clear', { index })}
							>
								✕
							</button>
						</div>
					</div>
				</div>
			{/each}
		</div>

		{#if options.length === 0}
			<p class="text-xs opacity-60">Claim some characters to add them to your team.</p>
		{/if}
	</div>
</div>
