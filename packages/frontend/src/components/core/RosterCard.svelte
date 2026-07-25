<script lang="ts">
	import classNames from 'classnames';
	import { SpawnColor } from '$types/character-spawn.type';

	// A single claimed spawn, already resolved to display-ready values by the
	// parent (labels come from the local @3xl/data registry, the face portrait from
	// the character definition, place names from the municipality layer) — this card
	// renders UI only.
	export let label: string;
	// The character's active face portrait (definition.face → manifest default).
	export let faceUrl: string | null = null;
	// The Supabase show(s) this character belongs to (via show_characters).
	export let showNames: string[] = [];
	export let locationName: string;
	export let claimedAt: string;
	// The weighted colour rolled for this spawn (stored in Supabase).
	export let color: SpawnColor;

	// Literal Tailwind classes so the swatch colours survive the v4 content scan.
	const swatchClasses: Record<SpawnColor, string> = {
		[SpawnColor.Red]: 'bg-red-500',
		[SpawnColor.Yellow]: 'bg-yellow-400',
		[SpawnColor.Blue]: 'bg-blue-500',
		[SpawnColor.Orange]: 'bg-orange-500',
		[SpawnColor.Green]: 'bg-green-500',
		[SpawnColor.Purple]: 'bg-purple-500'
	};

	$: swatchClass = swatchClasses[color];
</script>

<div class="card overflow-hidden bg-base-100 shadow-md">
	<!-- The spawn's rolled colour reads at a glance as the portrait backdrop. -->
	<figure class={classNames('flex h-[180px] items-center justify-center p-4', swatchClass)} title={color}>
		{#if faceUrl}
			<img src={faceUrl} alt={label} class="h-full max-w-full object-contain" />
		{:else}
			<div class="flex items-center justify-center opacity-40">
				<span class="text-4xl">👤</span>
			</div>
		{/if}
	</figure>
	<div class="card-body gap-2 p-4">
		<h2 class="card-title text-base">
			{label}
		</h2>
		<div class="flex flex-wrap gap-2">
			{#each showNames as showName (showName)}
				<span class="badge badge-ghost">{showName}</span>
			{/each}
			{#if showNames.length === 0}
				<span class="badge badge-ghost badge-outline opacity-60">No show</span>
			{/if}
			<span class="badge badge-secondary">📍 {locationName}</span>
		</div>
		<span class="text-xs opacity-60">{claimedAt}</span>
	</div>
</div>
