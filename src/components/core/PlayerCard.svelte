<script lang="ts">
	import classNames from 'classnames';
	import { createEventDispatcher } from 'svelte';
	import { ThemeColors } from '$types/core.type';
	import type { PlayerCard } from '$types/player-card.type';

	export let card: PlayerCard;
	export let disabled: boolean = false;
	export let classes: string = '';

	const dispatch = createEventDispatcher<{ select: { card: PlayerCard } }>();

	const colorToBorder: Record<ThemeColors, string> = {
		[ThemeColors.Primary]: 'border-primary',
		[ThemeColors.Secondary]: 'border-secondary',
		[ThemeColors.Accent]: 'border-accent',
		[ThemeColors.Success]: 'border-success',
		[ThemeColors.Error]: 'border-error',
		[ThemeColors.Info]: 'border-info',
		[ThemeColors.Warning]: 'border-warning',
		[ThemeColors.Neutral]: 'border-neutral'
	};

	const colorToBadge: Record<ThemeColors, string> = {
		[ThemeColors.Primary]: 'badge-primary',
		[ThemeColors.Secondary]: 'badge-secondary',
		[ThemeColors.Accent]: 'badge-accent',
		[ThemeColors.Success]: 'badge-success',
		[ThemeColors.Error]: 'badge-error',
		[ThemeColors.Info]: 'badge-info',
		[ThemeColors.Warning]: 'badge-warning',
		[ThemeColors.Neutral]: 'badge-neutral'
	};

	$: wrapperClasses = classNames(
		'card bg-base-100 border-2 shadow-md transition-transform aspect-square',
		colorToBorder[card.color],
		{
			'opacity-50 cursor-not-allowed': disabled,
			'cursor-pointer hover:-translate-y-1 hover:shadow-xl': !disabled
		},
		classes
	);

	function handleSelect() {
		if (!disabled) {
			dispatch('select', { card });
		}
	}
</script>

<button type="button" class={wrapperClasses} {disabled} on:click={handleSelect}>
	<div class="card-body items-center justify-between gap-2 p-4 text-center">
		<span class={classNames('badge badge-outline badge-sm self-start', colorToBadge[card.color])}>
			{card.kind}
		</span>
		<span class="text-4xl leading-none">{card.icon}</span>
		<h3 class="card-title text-base">{card.label}</h3>
		<p class="text-xs opacity-70">{card.description}</p>
	</div>
</button>
