<script lang="ts">
	import classNames from 'classnames';
	import { createEventDispatcher } from 'svelte';
	import Icon from '$components/core/Icon.svelte';
	import MugenLineup from '$components/core/MugenLineup.svelte';
	import { TEAM_SIZE, type Team } from '$services/team.service';
	import { SpawnColor } from '$types/character-spawn.type';

	// Presentational only — the parent owns the team service and applies changes.
	export let teams: Team[] = [];
	export let activeTeamId: string | null = null;
	// Every claimed spawn, keyed by spawn id, used to resolve each team slot's label,
	// sprite, colour, stat, location and shows. Picks are chosen from the roster grid.
	export let options: {
		id: string;
		label: string;
		basePath: string | null;
		color?: SpawnColor | null;
		stat?: number | null;
		location?: string | null;
		shows?: string[];
	}[] = [];

	// Literal Tailwind classes so the swatch colours survive the v4 content scan.
	const swatchClasses: Record<SpawnColor, string> = {
		[SpawnColor.Red]: 'bg-red-500',
		[SpawnColor.Yellow]: 'bg-yellow-400',
		[SpawnColor.Blue]: 'bg-blue-500',
		[SpawnColor.Orange]: 'bg-orange-500',
		[SpawnColor.Green]: 'bg-green-500',
		[SpawnColor.Purple]: 'bg-purple-500'
	};

	const dispatch = createEventDispatcher<{
		create: void;
		remove: { teamId: string };
		rename: { teamId: string; name: string };
		activate: { teamId: string };
		// One slot emptied, by index — the parent owns the colour rule that a removed
		// lead may invalidate.
		clearMember: { teamId: string; index: number };
	}>();

	$: labelById = new Map(options.map((option) => [option.id, option.label]));
	$: basePathById = new Map(options.map((option) => [option.id, option.basePath]));
	$: colorById = new Map(options.map((option) => [option.id, option.color ?? null]));
	$: statById = new Map(options.map((option) => [option.id, option.stat ?? null]));
	$: locationById = new Map(options.map((option) => [option.id, option.location ?? null]));
	$: showsById = new Map(options.map((option) => [option.id, option.shows ?? []]));

	function filledCount(team: Team): number {
		return team.memberIds.filter((id): id is string => Boolean(id)).length;
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
						{@const memberBasePaths = team.memberIds.map((id) =>
							id ? (basePathById.get(id) ?? null) : null
						)}
						{@const memberColors = team.memberIds.map((id) =>
							id ? (colorById.get(id) ?? null) : null
						)}
						{@const memberLocations = team.memberIds.map((id) =>
							id ? (locationById.get(id) ?? null) : null
						)}
						{@const memberStats = team.memberIds.map((id) =>
							id ? (statById.get(id) ?? null) : null
						)}
						{@const leadId = team.memberIds.find((id): id is string => Boolean(id)) ?? null}
						<div class="mt-3 flex flex-col gap-3">
							<div class="flex flex-col items-center gap-2">
								<!-- Rolled stat over each pick, aligned to its canvas cell (three
								     80px cells with an 8px gap = 256px = w-64). -->
								<div class="flex w-64 gap-2">
									{#each memberStats as stat, index (index)}
										<span class="flex w-20 justify-center">
											{#if stat !== null}
												<span class="badge badge-primary badge-sm" title="Character stat">
													<Icon name="skoll/d10" alt="Character stat" classes="h-3.5 w-3.5" />
													{stat}
												</span>
											{/if}
										</span>
									{/each}
								</div>
								<!-- All three picks' idle animations on a single canvas, each
								     height-normalised like the board, mirrored, over its spawn colour. -->
								<figure class="flex h-28 w-64 items-center justify-center overflow-hidden rounded bg-base-300">
									<!-- No {#key} around this: the lineup swaps its own slots in place, and
									     remounting it would build (and strand) a WebGL context per change. -->
									<MugenLineup
										basePaths={memberBasePaths}
										colors={memberColors}
										cellWidth={80}
										cellHeight={112}
									/>
								</figure>
								<!-- Municipality name under each pick, aligned to its canvas cell
								     (three 80px cells with an 8px gap = 256px = w-64). -->
								<div class="flex w-64 gap-2">
									{#each memberLocations as location, index (index)}
										<span
											class="w-20 truncate text-center text-[10px] leading-tight opacity-70"
											title={location ?? ''}>{location ?? ''}</span
										>
									{/each}
								</div>
							</div>

							<!-- Slot roster under the animations: the lead (slot 0), then the two
							     teammate slots, each showing its pick's name or "empty". Picks are
							     added/removed from the roster grid's per-card buttons. -->
							<div class="flex flex-col gap-2">
								{#each team.memberIds as memberId, index (index)}
									{@const isLead = index === 0}
									<div class="flex items-center gap-2">
										<span class="w-10 shrink-0 text-[10px] font-medium uppercase opacity-50">
											{isLead ? 'Lead' : `#${index + 1}`}
										</span>
										{#if memberId}
											{@const memberLabel = labelById.get(memberId) ?? memberId}
											<span class="badge badge-outline badge-sm">{memberLabel}</span>
											<button
												class="btn btn-ghost btn-xs btn-square"
												title="Remove from team"
												aria-label="Remove {memberLabel} from team"
												on:click={() => dispatch('clearMember', { teamId: team.id, index })}
											>
												✕
											</button>
										{:else}
											<span class="text-xs opacity-40">— Empty slot —</span>
										{/if}
									</div>
								{/each}
							</div>

							<!-- Summary of the first selected pick (lead, or first filled slot):
							     its rolled colour, the Supabase show(s) it belongs to, and the
							     region it was originally claimed in. -->
							{#if leadId}
								{@const leadColor = colorById.get(leadId) ?? null}
								{@const leadShows = showsById.get(leadId) ?? []}
								{@const leadLocation = locationById.get(leadId) ?? null}
								<div class="flex flex-col gap-2 rounded-box bg-base-200 p-3">
									<div class="flex items-center gap-2">
										<span class="w-16 shrink-0 text-[10px] font-medium uppercase opacity-50">Colour</span>
										{#if leadColor}
											<span
												class={classNames('inline-block h-4 w-4 rounded-full', swatchClasses[leadColor])}
												title={leadColor}
											></span>
											<span class="text-xs capitalize opacity-70">{leadColor}</span>
										{:else}
											<span class="text-xs opacity-40">—</span>
										{/if}
									</div>
									<div class="flex items-start gap-2">
										<span class="w-16 shrink-0 text-[10px] font-medium uppercase opacity-50">Show</span>
										<div class="flex flex-wrap gap-1">
											{#each leadShows as showName (showName)}
												<span class="badge badge-ghost badge-sm">{showName}</span>
											{/each}
											{#if leadShows.length === 0}
												<span class="badge badge-ghost badge-outline badge-sm opacity-60">No show</span>
											{/if}
										</div>
									</div>
									<div class="flex items-center gap-2">
										<span class="w-16 shrink-0 text-[10px] font-medium uppercase opacity-50">Region</span>
										<span class="badge badge-secondary badge-sm">📍 {leadLocation ?? 'Ultramar'}</span>
									</div>
								</div>
							{/if}
						</div>
					{:else}
						<div class="mt-2 flex flex-wrap items-center gap-1">
							<span class="badge badge-ghost badge-sm">{filledCount(team)}/{TEAM_SIZE}</span>
							{#each team.memberIds as memberId, index (index)}
								{#if memberId}
									<span class="badge badge-outline badge-sm">{labelById.get(memberId) ?? memberId}</span>
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
