<script lang="ts">
	import classNames from 'classnames';
	import IdleSprite from '$components/core/IdleSprite.svelte';
	import ShowIcon from '$components/core/ShowIcon.svelte';
	import restoreCatalanArticle from '$utils/string/restore-catalan-article';
	import { showIconName } from '$utils/show/show-icon';
	import {
		SPAWN_BORDER_CLASSES,
		SPAWN_FILL_CLASSES,
		SPAWN_PANEL_CLASSES
	} from '$components/core/spawn-colors';
	import type { SpawnColor } from '$types/character-spawn.type';

	// One character, as this game draws one: a statue of them — standing on a tilted
	// floor in their own colour, with their show's mark painted on it and, where there
	// is room for it, their name and the place they were claimed on a panel underneath.
	//
	// It stands on its own: hand it a character from the seed or from Supabase — the
	// frames folder, a colour, and the two captions — and it assembles the whole
	// picture itself, taking nothing from the surface it is put on but its width.
	//
	// This is the only place that picture is built. The sidebar's strip rows three of
	// them; a map pin carries three uncaptioned at pin size — the difference between
	// those surfaces is the width they hand this statue and whether they ask for the
	// caption, never a second drawing of the same thing.

	export let label: string = '';
	export let basePath: string | null = null;
	export let color: SpawnColor;
	// Where the card was claimed — the town's name as the layer holds it, article and
	// all. Null leaves the name standing on its own.
	export let locationName: string | null = null;
	// The TMDB id of the character's show — its glyph goes on the floor. Null (or a
	// show with no glyph drawn yet) leaves the floor bare rather than badging it with
	// a stand-in.
	export let showId: number | null = null;
	// Mirror the character. True is the player's own side; false the unmirrored art a
	// rival side uses, so the two face each other.
	export let flipped: boolean = true;
	export let classes: string = '';

	// The ground: the square itself, laid down flat and seen in perspective, rather than
	// a trapezoid drawn to look like one. It is a real tilt, so whatever is put on the
	// tile — the show's glyph — is laid down with it instead of standing up on top of a
	// shape that merely resembles a floor.
	//
	// The two numbers are chosen to land the tile exactly where the drawn trapezoid used
	// to be. Turning a square of side S about its front edge by θ, seen from a distance
	// d, puts its back edge at d/(d + S·sinθ) of the front's width and a height of
	// S·cosθ·d/(d + S·sinθ) above it. Wanting a back edge half the front's and a depth of
	// a third of the square gives d = S·sinθ and cosθ = 2/3 — that is θ = 48.19° and
	// d = 0.7454·S. The distance is in cqw so it tracks the square's own width (the
	// square declares itself the container), CSS perspective taking no percentage.
	const GROUND_DEPTH = 1 / 3;
	const GROUND = 'origin-bottom [transform:perspective(74.536cqw)_rotateX(48.19deg)]';

	// The character stands halfway up that plane — on the middle of the floor, with as
	// much of it behind them as in front.
	const BASELINE = GROUND_DEPTH / 2;

	$: showIcon = showIconName(showId);

	// The gazetteer files the towns come from park the article after a comma to sort by
	// — "Vall de Boí, la" — so the statue puts it back at the front before saying it.
	// A caller that has already restored it hands over a name with no trailing article
	// to move, and gets it back untouched.
	$: place = locationName ? restoreCatalanArticle(locationName) : null;
</script>

<div class={classNames('flex min-w-0 flex-col', classes)}>
	<!-- The box the character is seen through: a third again as tall as it is wide,
		which is the room a standing character needs. It draws nothing of its own — the
		floor and the panel below carry the colour. -->
	<div class="relative aspect-[3/4] w-full">
		<!-- The square at the foot of it is what the character is drawn against, and it
			stays 1:1 whatever the box around it is: the size a character comes out at is a
			share of this square, so a taller box would otherwise make every character
			taller with it. The ground is drawn across its bottom third and the rest of the
			box is head room above. The character stands at the height its own sprite earns
			it — a tall one fills the square, a short one does not — and nothing is inset or
			clipped, so no part of a frame is ever cut. -->
		<div class="@container absolute inset-x-0 bottom-0 aspect-square">
			<!-- The floor tile: the square laid flat. The show's glyph is painted across the
				whole of it — the same mark the map pins that show with — so it is tilted by
				the tile rather than sitting up on it, and the character stands in front of
				it. White at less than full strength so it reads as painted on the ground and
				never as loud as whoever is standing on it. -->
			<div
				class={classNames(
					'absolute inset-0 border text-white/60',
					GROUND,
					SPAWN_FILL_CLASSES[color],
					SPAWN_BORDER_CLASSES[color]
				)}
			>
				{#if showIcon}
					<!-- The colour is the tile's to set: the glyph paints in `currentColor`, so
						it takes it from here rather than carrying one of its own. -->
					<ShowIcon name={showIcon} classes="absolute inset-0 [&>svg]:h-full [&>svg]:w-full" />
				{/if}
			</div>

			<IdleSprite {basePath} {label} {flipped} baseline={BASELINE} />
		</div>
	</div>

	<!-- Who that is, and under it where they were claimed — on a panel in the same
		colour the floor is painted, so the card reads as one object in one colour rather
		than a picture with a caption. Either line too long for the card is cut with an
		ellipsis rather than wrapped: a row of these must keep one height between them,
		whatever they are called and wherever they were pulled. -->
	<div class={classNames('border', SPAWN_PANEL_CLASSES[color], SPAWN_BORDER_CLASSES[color])}>
		<!-- Each row carries its own black band over the colour: a light one under the
			name, a heavier one under the place. The ink follows the band — the panel's own
			(black on yellow, white on the rest) reads over the light one, while the heavy
			one is dark enough on every swatch to want white whatever the panel says. -->
		<div class="truncate bg-black/20 px-1 py-0.5 text-center text-sm font-semibold" title={label}>
			{label}
		</div>
		{#if place}
			<div class="truncate bg-black/50 px-1 py-0.5 text-center text-xs text-white/70" title={place}>
				{place}
			</div>
		{/if}
	</div>
</div>
