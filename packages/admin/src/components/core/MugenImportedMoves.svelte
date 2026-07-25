<script lang="ts">
	import classNames from 'classnames';
	import MugenAnimationPreview from '$components/core/MugenAnimationPreview.svelte';
	import type { MugenImportedMove, MugenImportedMoveset } from '$types/mugen-move.type';

	// The extracted moveset (static/<id>/mugen-moves.json) and the frames folder
	// (relative to the static root) previews load their manifest from.
	export let moveset: MugenImportedMoveset;
	export let basePath: string;
	export let classes: string = '';

	// Move currently playing in the preview panel, if any.
	let previewed: MugenImportedMove | null = null;

	const movetypeLabels: Record<string, string> = {
		A: 'Attack',
		I: 'Idle',
		H: 'Hurt'
	};

	$: containerClasses = classNames('flex flex-col gap-4', classes);

	function togglePreview(move: MugenImportedMove) {
		previewed = previewed?.stateNo === move.stateNo ? null : move;
	}
</script>

<div class={containerClasses}>
	{#if previewed}
		<div class="flex items-center gap-4 rounded-box bg-base-200 p-4">
			<!-- Remount when the move changes so the player reloads cleanly. -->
			{#key previewed.stateNo}
				<MugenAnimationPreview {basePath} animation={previewed.animation} />
			{/key}
			<div class="flex flex-col gap-1">
				<span class="font-semibold">{previewed.name}</span>
				<span class="font-mono text-xs opacity-70">
					state {previewed.stateNo} → {previewed.animation}
				</span>
				<button class="btn btn-ghost btn-xs w-fit" on:click={() => (previewed = null)}>
					Close preview
				</button>
			</div>
		</div>
	{/if}

	<div class="overflow-x-auto">
		<table class="table table-zebra table-sm">
			<thead>
				<tr>
					<th>Move</th>
					<th>State</th>
					<th>Type</th>
					<th>Input</th>
					<th>Damage</th>
					<th>Animation</th>
					<th></th>
				</tr>
			</thead>
			<tbody>
				{#each moveset.moves as move (move.stateNo)}
					<tr>
						<td class="font-medium">{move.name}</td>
						<td class="font-mono text-xs">{move.stateNo}</td>
						<td>
							{#if move.movetype}
								<span
									class={classNames('badge badge-sm', {
										'badge-error': move.movetype === 'A',
										'badge-ghost': move.movetype !== 'A'
									})}
								>
									{movetypeLabels[move.movetype] ?? move.movetype}
								</span>
							{/if}
						</td>
						<td>
							{#if move.inputs.some((input) => input !== '')}
								<div class="flex flex-col gap-1">
									{#each move.inputs.filter((input) => input !== '') as input}
										<kbd class="kbd kbd-sm w-fit font-mono">{input}</kbd>
									{/each}
								</div>
							{:else}
								<span class="text-xs opacity-50">auto / AI</span>
							{/if}
						</td>
						<td>{move.damage ?? '—'}</td>
						<td class="font-mono text-xs">{move.animation || '—'}</td>
						<td>
							{#if move.animation}
								<button
									class={classNames('btn btn-xs', {
										'btn-primary': previewed?.stateNo === move.stateNo,
										'btn-outline': previewed?.stateNo !== move.stateNo
									})}
									on:click={() => togglePreview(move)}
								>
									Preview
								</button>
							{/if}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

	{#if moveset.commands.length > 0}
		<div class="collapse-arrow collapse bg-base-200">
			<input type="checkbox" />
			<div class="collapse-title text-sm font-medium">
				Raw command list ({moveset.commands.length})
			</div>
			<div class="collapse-content overflow-x-auto">
				<table class="table table-xs">
					<thead>
						<tr>
							<th>Name</th>
							<th>Input</th>
						</tr>
					</thead>
					<tbody>
						{#each moveset.commands as command (command.name)}
							<tr>
								<td class="font-mono text-xs">{command.name}</td>
								<td><kbd class="kbd kbd-sm font-mono">{command.input}</kbd></td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	{/if}
</div>
