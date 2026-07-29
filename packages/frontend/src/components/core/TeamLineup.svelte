<script lang="ts">
	import classNames from 'classnames';
	import IdleSprite from '$components/core/IdleSprite.svelte';
	import ShowIcon from '$components/core/ShowIcon.svelte';
	import { showIconName } from '$utils/show/show-icon';
	import { SpawnColor } from '$types/character-spawn.type';

	// The team as a row of characters standing on their own colour — who is fielded,
	// what colour they bend and what show they come from, with none of a card's chrome,
	// so a team can be shown where a row of cards would be too much to read.

	// One entry per team member, in the order they are fielded (the leader first).
	// `showId` is the TMDB id of the show the character comes from, or null for one in
	// no show — or one whose show has no glyph drawn for it, which renders as a bare
	// floor rather than as a stand-in badge.
	export let members: {
		label: string;
		basePath: string | null;
		color: SpawnColor;
		showId: number | null;
	}[] = [];
	// Mirror the characters — true (the default) is the player's own side.
	export let flipped: boolean = true;
	export let classes: string = '';

	// The same swatches the cards paint their portrait field with — here the colour is
	// the ground the character stands on, and the square's own edge.
	const colorFills: Record<SpawnColor, string> = {
		[SpawnColor.Red]: 'bg-red-500',
		[SpawnColor.Yellow]: 'bg-yellow-400',
		[SpawnColor.Blue]: 'bg-blue-500',
		[SpawnColor.Orange]: 'bg-orange-500',
		[SpawnColor.Green]: 'bg-green-500',
		[SpawnColor.Purple]: 'bg-purple-500'
	};
	const colorBorders: Record<SpawnColor, string> = {
		[SpawnColor.Red]: 'border-red-500',
		[SpawnColor.Yellow]: 'border-yellow-400',
		[SpawnColor.Blue]: 'border-blue-500',
		[SpawnColor.Orange]: 'border-orange-500',
		[SpawnColor.Green]: 'border-green-500',
		[SpawnColor.Purple]: 'border-purple-500'
	};

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

	// The character stands a third of the way up that plane — on the ground rather than
	// at the near edge of it, but near enough the front that most of the floor is behind
	// them rather than in front.
	const BASELINE = GROUND_DEPTH / 3;
</script>

<div class={classNames('flex w-full gap-2', classes)}>
	{#each members as member, index (index)}
		{@const showIcon = showIconName(member.showId)}
		<!-- Each member is a column: the square, then their name under it. The three
			share the row's width between them, so the column is what carries the width
			and the square inside it is as tall as that width — whatever the panel's, so
			the row keeps its shape as the panel narrows. -->
		<div class="flex min-w-0 flex-1 flex-col gap-1">
			<!-- The box the character is seen through: a third again as tall as it is wide,
				which is the room a standing character needs, and square-cornered. It keeps
				its own edge in the character's colour now that the colour no longer fills
				it. -->
			<div class={classNames('relative aspect-[3/4] w-full border', colorBorders[member.color])}>
				<!-- The square at the foot of it is what the character is drawn against, and
					it stays 1:1 whatever the box around it is: the size a character comes out
					at is a share of this square, so a taller box would otherwise make every
					character taller with it. The ground is drawn across its bottom third and
					the rest of the box is head room above. The character stands at the height
					its own sprite earns it — a tall one fills the square, a short one does not
					— and nothing is inset or clipped, so no part of a frame is ever cut. -->
				<div class="@container absolute inset-x-0 bottom-0 aspect-square">
					<!-- The floor tile: the square laid flat. The show's glyph is painted across
						the whole of it — the same mark the map pins that show with — so it is
						tilted by the tile rather than sitting up on it, and the character stands
						in front of it. White at less than full strength so it reads as painted on
						the ground and never as loud as whoever is standing on it. -->
					<div
						class={classNames(
							'absolute inset-0 text-white/60',
							GROUND,
							colorFills[member.color]
						)}
					>
						{#if showIcon}
							<!-- The colour is the tile's to set: the glyph paints in `currentColor`,
								so it takes it from here rather than carrying one of its own. -->
							<ShowIcon
								name={showIcon}
								classes="absolute inset-0 [&>svg]:h-full [&>svg]:w-full"
							/>
						{/if}
					</div>

					<IdleSprite
						basePath={member.basePath}
						label={member.label}
						{flipped}
						baseline={BASELINE}
					/>
				</div>
			</div>

			<!-- Who that is. A name too long for the column is cut with an ellipsis rather
				than wrapped: the three columns are a row and must keep one height between
				them, whatever they are called. -->
			<div class="truncate text-center text-xs font-semibold" title={member.label}>
				{member.label}
			</div>
		</div>
	{/each}
</div>
