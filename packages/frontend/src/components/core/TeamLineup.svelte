<script context="module" lang="ts">
	// What share of its own width a full row covers. The three cells come to 110% of it and the
	// middle pulls 15% of that back over the two beside it, so 95% is drawn and 5% is spare (see
	// `cellShares`, which says why the shares are not simply made to add up).
	//
	// Exported because a surface that has to line this row up with something else cannot work it
	// out from outside — a booster box's front, which the cards it opens onto stand edge to edge
	// with. Such a surface asks for 1/0.95 of the width it wants covered and centres the row in
	// it (`classes="justify-center"`), which puts the drawn ends exactly on the ends it is
	// matching. Everything else hands the row a width and lets the 5% fall where it falls.
	export const LINEUP_ROW_SPAN = 0.95;
</script>

<script lang="ts">
	import classNames from 'classnames';
	import { createEventDispatcher, onMount } from 'svelte';
	import CharacterStatue from '$components/core/CharacterStatue.svelte';
	import { showLogos, loadShowLogos } from '$services/shows.service';
	import { SPAWN_PANEL_CLASSES } from '$components/core/spawn-colors';
	import { SpawnBox, type SpawnColor } from '$types/character-spawn.type';

	// The team as a row of cards — who is fielded, what colour they bend, where they
	// were claimed and what show they come from. The card itself is CharacterStatue's;
	// this is only the row, sharing its width between them, and the banner over it that
	// says whose side it is — the lead's colour and the lead's show, in the show's own
	// lettering. That is the row's, not a statue's: a card says the show it is from with
	// the mark on its floor, and a side says the show it flies once, over all three.

	// One entry per team member, in the order they are fielded (the leader first).
	// `spawnedAt` is what a real card was minted at, and it is optional for the same
	// reason its claim place is: a town's seeded house team was never minted, so it
	// leaves the year out and the statue says the place alone. `box` is optional on the
	// same grounds — a side that was never pulled out of anything is printed black, the
	// statue's own default and what the commoner box is.
	export let members: {
		label: string;
		basePath: string | null;
		color: SpawnColor;
		box?: SpawnBox;
		locationName: string | null;
		spawnedAt?: string | number | Date | null;
		showId: number | null;
	}[] = [];
	// Mirror the characters — true (the default) is the player's own side.
	export let flipped: boolean = true;
	// Passed straight through to every statue: veil each character even where the session
	// has already watched it arrive. The row has no opinion on whether a reveal is worth
	// spending — the surface standing it up does. The map's corner spends none (a side that
	// re-frames itself as the map moves would flicker); the roster spends one on every card,
	// being the place a player comes to look at them.
	export let alwaysReveal: boolean = false;
	// Whether a member can be pressed. False wherever the row is a picture of a side — the
	// map's corner, a town's pin — since a button around a statue would offer a press that
	// does nothing. True on the roster, where pressing a member is how it comes off the
	// team; it is dispatched as `select` with the member's own index, which is the index it
	// arrived at and not the place the row stood it in.
	export let selectable: boolean = false;
	// Passed straight through as well: whether a character arrives behind a veil at all.
	// False for a surface that uncovers the row itself — a booster box dissolves over its
	// cards, and a veil under that would spend a character's one reveal behind something
	// opaque. Such a surface waits instead on `ready`, which each statue says when its
	// picture is up and this row forwards with the member it was said of.
	export let veiled: boolean = true;
	export let classes: string = '';

	const dispatch = createEventDispatcher<{
		select: { index: number };
		ready: { index: number };
	}>();

	// Whether something other than a member is standing in the middle of the row. The one
	// thing that is ever put there is a face — the avatar a booster box deals, which comes
	// out of the same box as the cards either side of it and is not one of them.
	$: hasMiddle = Boolean($$slots.middle);

	// The three cells: 35% of the row to each flank and 40% to the middle, which is
	// pulled 7.5% over each of the two beside it. Said as widths — a basis that neither
	// grows nor shrinks — rather than as shares of what is left, so each cell measures
	// exactly the figure it was given whatever the row turns out to be. Shares were how
	// this read while the three of them and the margins happened to come to a whole row;
	// these do not (110% of basis less the 15% the middle pulls back is 95%), so the row
	// carries 5% of empty at its far end, and a share would have quietly handed that out
	// again and made every cell wider than it says.
	// The middle is raised because overlapping is a question of paint order otherwise,
	// and paint order runs one way: it would cover the flank before it and be covered by
	// the flank after it, which is an overlap on one side only.
	// Written out as whole classes because Tailwind only emits what it can see spelled.
	// Any cell past the third (there is no such team) falls back to a flank's width.
	const cellShares = [
		'shrink-0 grow-0 basis-[35%]',
		'relative z-10 -mx-[7.5%] shrink-0 grow-0 basis-[40%]',
		'shrink-0 grow-0 basis-[35%]'
	];

	// Where each member stands. The team arrives in slot order — the leader first — and the
	// row's middle is the wider piece lapped over the two beside it, so that is where the
	// leader goes: the one the row is about stands in front of their side rather than at the
	// end of it. Only the first two trade places; everyone after keeps the order they came
	// in, so nothing is ever dropped by being arranged. A side of one has no middle to stand
	// in and is left where it is.
	// Each carries the index it arrived at, so what a press says is which member was
	// pressed rather than which cell it happened to be standing in.
	$: standing = members.map((member, index) => ({ member, index }));
	$: lineup =
		standing.length < 2 ? standing : [standing[1], standing[0], ...standing.slice(2)];

	// The cells the row actually stands, in the order they are drawn. With something else in
	// the middle the members do not trade places: the swap exists to bring the leader into
	// that cell, and the cell is taken — so they simply fill the places either side of it in
	// the order they arrived, and the first of them keeps the front of the row.
	$: cells = hasMiddle
		? [
				...standing.slice(0, 1).map((entry) => ({ middle: false as const, ...entry })),
				{ middle: true as const },
				...standing.slice(1).map((entry) => ({ middle: false as const, ...entry }))
			]
		: lineup.map((entry) => ({ middle: false as const, ...entry }));

	// The logos are not fetched by being subscribed to (the glyphs are; these are not), so the
	// row asks for them itself — every row, since every row is bannered. The load is memoised in
	// the service, so a screen full of these shares the one read of the collection.
	onMount(() => void loadShowLogos());

	// The side's lead, whose colour and show the banner is: the first member as it arrived,
	// never the cell the row stood it in — the same lead the map takes a held town's show from,
	// so a side flies the one show wherever it is drawn. Null for a row with nobody in it, which
	// draws no band — a colour with no side under it is a stripe of paint.
	$: lead = members[0] ?? null;
	// The lead's show as the author enabled it, or null where the side flies none, where the
	// show has no logo enabled, and until the collection lands — the band is then the colour
	// alone. Nothing stands in for a missing wordmark: this band is not where a reader finds
	// out what show it is (the statues under it carry the mark, and the roster names it), so a
	// name lettered in its place would be a second kind of banner.
	$: bannerLogo = lead?.showId != null ? ($showLogos.get(lead.showId) ?? null) : null;
</script>

<div class={classNames('relative flex w-full', classes)}>
	<!-- The side's banner: the whole width of the row and hung off its top edge, so it lies
		across the head room every statue carries above its square rather than taking a strip of
		the row's height away from the cards. It is painted in the lead's colour, with the ink
		that reads on it (SPAWN_PANEL_CLASSES — yellow is the one swatch that wants black).
		One height whatever is on it, so the band is the same band under every show and does not
		shift with the proportions of a wordmark: the mark is fitted inside it, at its own aspect,
		and keeps a tenth of the width clear either side the way the box's foot does. The mark is
		not recoloured — the enabled logos are coloured lettering with a light outline, which
		reads on any of the six.
		Raised over the middle cell, which lifts itself to lap the two beside it: the band is the
		one thing on this row that is about all three, so nothing may come over it. -->
	{#if lead}
		<div
			class={classNames(
				'absolute inset-x-0 top-0 z-20 flex h-12 items-center justify-center rounded-md px-2',
				SPAWN_PANEL_CLASSES[lead.color]
			)}
		>
			{#if bannerLogo}
				<img
					src={bannerLogo.url}
					alt={bannerLogo.name}
					class="max-h-full max-w-[80%] object-contain"
				/>
			{/if}
		</div>
	{/if}

	<!-- The statue is the same picture on either surface, so it is written once and the
		cell's share of the row goes to whichever element is standing it up: the statue
		itself where the row is a picture of a side, and the button around it where a press
		means something. A row that is only looked at gets no button at all rather than a
		dead one — the map's corner and a town's pin are exactly the markup they always
		were. -->
	{#each cells as cell, place (place)}
		{#if cell.middle}
			<!-- Whatever was handed to the middle, in the cell the leader would have stood in and
				at the same share of the row: raised over the two beside it, lapped over both. It is
				centred down the cell because it is not a statue and has no ground to stand on — a
				face is a square, and a square as wide as this cell is nothing like as tall as the
				card either side of it. -->
			<div class={classNames('flex min-w-0 items-center', cellShares[place] ?? cellShares[0])}>
				<slot name="middle" />
			</div>
		{:else}
			{@const statue = {
				label: cell.member.label,
				basePath: cell.member.basePath,
				color: cell.member.color,
				box: cell.member.box ?? SpawnBox.Black,
				locationName: cell.member.locationName,
				spawnedAt: cell.member.spawnedAt ?? null,
				showId: cell.member.showId,
				flipped,
				alwaysReveal,
				veiled
			}}
			{#if selectable}
				<button
					type="button"
					class={classNames(
						'min-w-0 rounded-box transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
						cellShares[place] ?? cellShares[0]
					)}
					on:click={() => dispatch('select', { index: cell.index })}
				>
					<CharacterStatue
						{...statue}
						classes="w-full"
						on:ready={() => dispatch('ready', { index: cell.index })}
					/>
				</button>
			{:else}
				<CharacterStatue
					{...statue}
					classes={cellShares[place] ?? cellShares[0]}
					on:ready={() => dispatch('ready', { index: cell.index })}
				/>
			{/if}
		{/if}
	{/each}
</div>
