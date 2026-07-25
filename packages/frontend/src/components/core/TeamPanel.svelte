<script lang="ts">
	import classNames from 'classnames';
	import { createEventDispatcher } from 'svelte';
	import MugenStage from '$components/core/MugenStage.svelte';
	import { TEAM_SIZE, type Team } from '$services/team.service';

	// Presentational only — the parent owns the team service and applies changes.
	export let teams: Team[] = [];
	export let activeTeamId: string | null = null;
	// Characters the player can pick from (deduplicated roster characters).
	export let options: { id: string; label: string; basePath: string | null }[] = [];

	const dispatch = createEventDispatcher<{
		create: void;
		remove: { teamId: string };
		rename: { teamId: string; name: string };
		activate: { teamId: string };
		select: { teamId: string; index: number; characterId: string | null };
		clear: { teamId: string; index: number };
	}>();

	$: labelById = new Map(options.map((option) => [option.id, option.label]));
	$: basePathById = new Map(options.map((option) => [option.id, option.basePath]));

	function filledCount(team: Team): number {
		return team.memberIds.filter((id): id is string => Boolean(id)).length;
	}

	function handleSelect(teamId: string, index: number, event: Event): void {
		const value = (event.currentTarget as HTMLSelectElement).value;
		dispatch('select', { teamId, index, characterId: value || null });
	}

	function handleRename(teamId: string, event: Event): void {
		dispatch('rename', { teamId, name: (event.currentTarget as HTMLInputElement).value });
	}
</script>

<div class="card bg-base-100 shadow-md">
	<div class="card-body gap-4 p-4">
		<div class="flex items-center justify-between">
			<h2 class="card-title text-base">Teams</h2>
			<button class="btn btn-primary btn-sm" on:click={() => dispatch('create')}>+ New team</button>
		</div>

		{#if teams.length === 0}
			<p class="text-xs opacity-60">No teams yet. Create one to start assembling characters.</p>
		{/if}

		<div class="flex flex-col gap-3">
			{#each teams as team (team.id)}
				{@const isActive = team.id === activeTeamId}
				{@const chosen = new Set(team.memberIds.filter((id): id is string => Boolean(id)))}
				<div
					class={classNames('rounded-box border p-3', {
						'border-primary bg-primary/5': isActive,
						'border-base-300 bg-base-200': !isActive
					})}
				>
					<div class="flex items-center gap-2">
						<input
							class="radio radio-primary radio-sm"
							type="radio"
							name="active-team"
							checked={isActive}
							title="Set as active team"
							on:change={() => dispatch('activate', { teamId: team.id })}
						/>
						<input
							class="input input-bordered input-sm w-full"
							type="text"
							placeholder="Team name (optional)"
							value={team.name}
							on:input={(event) => handleRename(team.id, event)}
						/>
						<button
							class="btn btn-ghost btn-sm btn-square"
							title="Delete team"
							on:click={() => dispatch('remove', { teamId: team.id })}
						>
							🗑
						</button>
					</div>

					{#if isActive}
						<div class="mt-3 flex flex-col gap-2">
							{#each team.memberIds as characterId, index (index)}
								{@const basePath = characterId ? basePathById.get(characterId) : null}
								<div class="flex items-center gap-2">
									<figure
										class="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded bg-base-300"
									>
										{#if basePath}
											<MugenStage {basePath} width={40} height={40} scale={0.32} />
										{:else}
											<span class="text-xs opacity-40">{index + 1}</span>
										{/if}
									</figure>
									<select
										class="select select-bordered select-sm w-full"
										value={characterId ?? ''}
										on:change={(event) => handleSelect(team.id, index, event)}
									>
										<option value="">— Empty slot —</option>
										{#each options as option (option.id)}
											<option
												value={option.id}
												disabled={chosen.has(option.id) && characterId !== option.id}
											>
												{option.label}
											</option>
										{/each}
									</select>
									{#if characterId}
										<button
											class="btn btn-ghost btn-sm btn-square"
											title="Clear slot"
											on:click={() => dispatch('clear', { teamId: team.id, index })}
										>
											✕
										</button>
									{/if}
								</div>
							{/each}
						</div>
					{:else}
						<div class="mt-2 flex flex-wrap items-center gap-1">
							<span class="badge badge-ghost badge-sm">{filledCount(team)}/{TEAM_SIZE}</span>
							{#each team.memberIds as characterId, index (index)}
								{#if characterId}
									<span class="badge badge-outline badge-sm">{labelById.get(characterId) ?? characterId}</span>
								{/if}
							{/each}
						</div>
					{/if}
				</div>
			{/each}
		</div>

		{#if options.length === 0}
			<p class="text-xs opacity-60">Claim some characters to add them to a team.</p>
		{/if}
	</div>
</div>
