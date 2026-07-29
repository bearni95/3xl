<script lang="ts">
	import classNames from 'classnames';
	import { DEFAULT_RARITY } from '$types/character-template.type';
	import { wowRarityLabel } from '$utils/rarity/wow-rarity';

	// The numeric tier to name. Anything outside the WoW tiers renders nothing —
	// a value above the highest tier has no name, and inventing one would read as
	// data.
	export let rarity: number = DEFAULT_RARITY;
	export let classes: string = '';

	// Tier names live in @3xl/shared (any package can name a rarity the same
	// way); the colour each tier is read in is a UI concern, so it stays here.
	const badgeClass: Record<number, string> = {
		0: 'badge-neutral',
		1: 'badge-success',
		2: 'badge-info',
		3: 'badge-secondary',
		4: 'badge-warning',
		5: 'badge-warning',
		6: 'badge-info'
	};

	$: label = wowRarityLabel(typeof rarity === 'number' ? rarity : DEFAULT_RARITY);
	$: computedClasses = classNames(
		'badge badge-sm',
		badgeClass[typeof rarity === 'number' ? rarity : DEFAULT_RARITY] ?? 'badge-ghost',
		classes
	);
</script>

{#if label}
	<span class={computedClasses}>{label}</span>
{/if}
