<script lang="ts">
	import classNames from 'classnames';
	import restoreCatalanArticle from '$utils/string/restore-catalan-article';
	import { spawnYearLabel } from '$utils/spawn/year';

	// One unopened booster pack, drawn in the document: the show's poster spanning the
	// full width of it, a coloured band above it saying the place the pack belongs to
	// and one below saying what is inside.
	//
	// It is 3:4, the very box a CharacterStatue is drawn in — a pack and the cards it
	// opens onto are the same object at two moments, and a grid that changes shape when
	// a pack is sliced open is a grid that jumps. The ratio is the component's own, not
	// the host's: hand it a width and it takes the height that goes with it, so the same
	// component is a grid cell or the whole panel purely by the box it is put in.
	// Everything written on it is sized off that width (the pack declares itself the
	// container), which is what keeps the bands the same share of the picture at both
	// sizes rather than a caption that grows out of them.
	//
	// (Both outer edges used to be serrated into teeth, after the texture PackSprite
	// bakes. A pack is picked out of a grid by the poster on it; the teeth only ate into
	// that poster twice and gave the tile a silhouette no other object on this panel
	// has.)

	// Show poster used as the cover, or null for a plain frame.
	export let coverUrl: string | null = null;
	// Full name of the place the pack belongs to, said in the top band.
	export let locationName: string | null = null;
	export let classes: string = '';

	// What the bands say, exactly as the baked pack says it: the place with the year
	// this copy would be minted in joined to it — "Barcelona '26" — and, below the
	// poster, what a pack holds. The gazetteer parks the article after a comma to
	// sort by, so it is put back at the front before the name is said.
	$: place = [locationName ? restoreCatalanArticle(locationName) : '', spawnYearLabel(Date.now())]
		.filter(Boolean)
		.join(' ');
</script>

<!-- 3:4, as the statue is. In a grid cell it is a column flex item and so takes the
	cell's width, the ratio giving it its height; stood up in a box that bounds the
	height instead, the host says `h-full` and the ratio gives the width back. -->
<div class={classNames('@container flex aspect-[3/4] min-h-0 flex-col shadow-md', classes)}>
	<div
		class="flex-none truncate bg-neutral px-1 text-center text-[5.4cqw] font-bold leading-snug text-neutral-content"
		title={place}
	>
		{place}
	</div>

	{#if coverUrl}
		<!-- The poster whole, never cropped: it is contained in whatever the two bands
			leave of the 3:4 box, so a 2:3 poster stands centred with the neutral showing
			at its sides rather than being cut to fill the width. -->
		<img src={coverUrl} alt="" class="min-h-0 w-full flex-1 bg-neutral object-contain" />
	{:else}
		<div class="min-h-0 w-full flex-1 bg-neutral"></div>
	{/if}

	<div
		class="flex-none bg-neutral px-1 text-center text-[5.4cqw] font-bold leading-snug text-neutral-content"
	>
		x5 Cartes Localitzades
	</div>
</div>
