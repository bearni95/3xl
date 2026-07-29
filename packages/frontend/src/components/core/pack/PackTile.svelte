<script lang="ts">
	import classNames from 'classnames';
	import restoreCatalanArticle from '$utils/string/restore-catalan-article';
	import { spawnYearLabel } from '$utils/spawn/year';

	// One unopened booster pack, drawn in the document: the show's poster spanning the
	// full width of it, a coloured band above it saying the place the pack belongs to
	// and one below saying what is inside, and both outer edges serrated into teeth —
	// the same object PackSprite bakes into a texture, assembled out of elements
	// instead so a grid of them costs no WebGL context at all.
	//
	// It draws at whatever width it is given and keeps the poster's own proportions,
	// so it is the box around it that decides whether a pack is a grid cell or the
	// whole panel. Everything written on it is sized off that width (the pack declares
	// itself the container), which is what keeps the bands the same share of the
	// picture at both sizes rather than a caption that grows out of them.

	// Show poster used as the cover, or null for a plain frame.
	export let coverUrl: string | null = null;
	// Full name of the place the pack belongs to, said in the top band.
	export let locationName: string | null = null;
	export let classes: string = '';

	// The teeth: one row of equilateral triangles, each with a base a tenth of the
	// pack's width, tiled edge to edge — a cone gradient per tooth, the notches
	// between them left transparent so the silhouette itself is serrated rather than
	// a rectangle with triangles painted over it. The strip's height is that base
	// times sin 60°, in cqw so the teeth stay equilateral at any width. The fill is
	// `currentColor`, so a band and its teeth take one colour from the same class.
	const TEETH_HEIGHT = 'h-[8.66cqw]';
	const TEETH_UP =
		'[background:conic-gradient(from_-45deg_at_bottom,#0000,currentColor_1deg_89deg,#0000_90deg)_0_0/10%_100%]';
	const TEETH_DOWN =
		'[background:conic-gradient(from_135deg_at_top,#0000,currentColor_1deg_89deg,#0000_90deg)_0_0/10%_100%]';

	// What the bands say, exactly as the baked pack says it: the place with the year
	// this copy would be minted in joined to it — "Barcelona '26" — and, below the
	// poster, what a pack holds. The gazetteer parks the article after a comma to
	// sort by, so it is put back at the front before the name is said.
	$: place = [locationName ? restoreCatalanArticle(locationName) : '', spawnYearLabel(Date.now())]
		.filter(Boolean)
		.join(' ');
</script>

<!-- The drop shadow is a filter rather than a box shadow: it follows the drawn
	silhouette, teeth and all, where a box shadow would draw the rectangle the pack
	is not. -->
<div class={classNames('@container flex min-h-0 flex-col drop-shadow-md', classes)}>
	<div class={classNames('w-full flex-none text-neutral', TEETH_HEIGHT, TEETH_UP)}></div>

	<div
		class="flex-none truncate bg-neutral px-1 text-center text-[5.4cqw] font-bold leading-snug text-neutral-content"
		title={place}
	>
		{place}
	</div>

	{#if coverUrl}
		<!-- The poster whole, never cropped: it takes the pack's full width in a grid
			cell, and gives height back when the pack is stood up in a box that bounds it. -->
		<img src={coverUrl} alt="" class="min-h-0 w-full flex-1 bg-neutral object-contain" />
	{:else}
		<div class="min-h-0 w-full flex-1 bg-neutral"></div>
	{/if}

	<div
		class="flex-none bg-neutral px-1 text-center text-[5.4cqw] font-bold leading-snug text-neutral-content"
	>
		x5 Cartes Localitzades
	</div>

	<div class={classNames('w-full flex-none text-neutral', TEETH_HEIGHT, TEETH_DOWN)}></div>
</div>
