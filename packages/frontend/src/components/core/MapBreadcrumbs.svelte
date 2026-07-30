<script lang="ts">
	import classNames from 'classnames';
	import { afterUpdate, onDestroy } from 'svelte';
	import { slide } from 'svelte/transition';
	import MapBreadcrumb from '$components/core/MapBreadcrumb.svelte';

	// Where the map is looking, as a bar across the top of the map itself rather than a line
	// in the panel beside it. What the crumbs name is the view — the region the map is
	// framed on, walked into from a pin, a crumb or the zoom — so they belong over the thing
	// they are about, and they head the corner's stack of plates rather than heading a
	// column that is about other things.
	//
	// The bar wears the panel's own surface rather than the plates' black: the crumbs head
	// the map the way the panel heads its column, so the two read as one chrome. It is
	// still a plate and not a caption laid on the imagery — 80% of that surface, so the
	// terrain shows through without the lettering ever having to be read off it.
	//
	// Each step is drawn the way the town panel draws the town it is open on — tile, place,
	// show — see MapBreadcrumb. Naming a place on this map and naming its show are one
	// statement, and this is the line already saying which place.
	//
	// A path that does not fit the row it is given is not scrolled sideways but collapsed:
	// the step the map is on, and beside it a button that drops the whole path down as a
	// column (see below). Sideways scrolling hid the crumb that matters most — the end of the
	// path is where a bar this long starts you off, so the head of it was the part out of
	// view, and reading the path meant dragging a strip of it past a fixed window.

	// The path from the top view down to the open region, root first. The last crumb is
	// where the map is and is not a link; every one before it walks back up to its tier.
	//
	// Each crumb also carries the show its place flies and the colour that place is drawn
	// in, which every step has — a town's own, above it the plurality of the towns under
	// it, and at the head of the path the plurality of the whole map. The caller decides
	// what those are (a held town flies its ruling team's show, not its own most-seen one);
	// this bar just letters whatever it is handed.
	export let crumbs: {
		label: string;
		key: string | null;
		showName?: string | null;
		showId?: number | null;
		tileClasses?: string | null;
	}[] = [];
	export let onSelect: (key: string | null) => void;
	export let classes: string = '';

	// Whether the whole path fits the share of the row left over after the `end` slot has
	// taken its width. Measured, not guessed at: how wide a path is depends on how many tiers
	// deep it goes and on the lengths of names nobody here chooses.
	let collapsed = false;
	// Whether the collapsed path has been dropped open. Only ever true while collapsed —
	// a bar wide enough for the path has nothing to drop.
	let expanded = false;

	// The row's share for the crumbs, and inside it a copy of the whole path laid out at its
	// natural width but never drawn. The copy is what gets measured: measuring the visible
	// crumbs would ask the collapsed row whether it fits, which it always does, and the bar
	// would flip between the two states forever. The copy is the same markup in the same
	// scroller, so the width it reports is the width the path would really take.
	let trackEl: HTMLElement | null = null;
	let probeEl: HTMLElement | null = null;
	let wrapperEl: HTMLElement | null = null;
	let observer: ResizeObserver | null = null;

	function measure() {
		if (!probeEl) return;
		// The scroller's own overflow, a pixel of slack against fractional layout widths.
		collapsed = probeEl.scrollWidth > probeEl.clientWidth + 1;
	}

	// The track changing width is the other half of it — the map column resizing, or the
	// search box beside the crumbs growing at a breakpoint. Crumb changes are caught by
	// afterUpdate instead, since the probe is stretched to the track and so does not itself
	// resize when the path it holds gets longer.
	function watch(track: HTMLElement) {
		observer?.disconnect();
		observer = new ResizeObserver(() => measure());
		observer.observe(track);
		measure();
	}

	$: if (trackEl) watch(trackEl);

	afterUpdate(measure);
	onDestroy(() => observer?.disconnect());

	// Nothing to be dropped open once the path fits again.
	$: if (!collapsed) expanded = false;

	// The step the map is on: the one crumb the collapsed row keeps.
	$: lastCrumb = crumbs[crumbs.length - 1];

	function pick(key: string | null) {
		expanded = false;
		onSelect(key);
	}

	// The column stands over the map, so a press anywhere else is a press on something the
	// panel is covering: it closes rather than being clicked through.
	function handleWindowPointerDown(event: MouseEvent) {
		if (!expanded || !wrapperEl) return;
		if (!wrapperEl.contains(event.target as Node)) expanded = false;
	}
</script>

<svelte:window
	on:pointerdown={handleWindowPointerDown}
	on:keydown={(event) => {
		if (event.key === 'Escape') expanded = false;
	}}
/>

<!-- The bar is as wide as the map, and it is a row: the crumbs on the left, and at its far
	end whatever the `end` slot puts there — the one place on the map that is about where the
	map is looking, so a way of naming a place belongs at the end of the path to one.
	`relative` because two things hang off this row: the invisible copy of the path that is
	measured, and the column the dots button drops. -->
<div bind:this={wrapperEl} class={classNames('relative', classes)}>
	<div
		class="flex items-center gap-3 rounded-lg bg-base-100/80 px-3 py-1.5 text-white shadow-xl"
	>
		<!-- `min-w-0` is what lets this share shrink to whatever the `end` slot leaves it,
			which is the width the path is measured against. -->
		<div bind:this={trackEl} class="relative min-w-0 flex-1">
			<!-- The path at its natural width, in a scroller stretched to the track: laid out, so
				it can be measured, and hidden, so it is never read. `invisible` and not `hidden`
				— a box with no layout has no width to report. -->
			<div
				bind:this={probeEl}
				class="breadcrumbs pointer-events-none invisible absolute inset-0 py-0 text-sm"
				aria-hidden="true"
			>
				<ul>
					{#each crumbs as crumb}
						<li>
							<MapBreadcrumb
								label={crumb.label}
								showName={crumb.showName ?? null}
								showId={crumb.showId ?? null}
								tileClasses={crumb.tileClasses ?? null}
							/>
						</li>
					{/each}
				</ul>
			</div>

			{#if collapsed}
				<!-- Collapsed: the button that holds the rest of the path, and then the step the map
					is on. The button is to its left because that is where the path it stands for was —
					it is the head of the row folded into one mark, not a menu appended to the end.
					Drawn as an outlined square the size of a crumb's tile: the row it stands in is a
					line of 32px tiles, so the one thing here that is pressed rather than read is given
					the same square and told apart by being a rule around empty rather than a fill.
					DaisyUI's square and its 32px are taken as they come; its colours are not — an
					outline button letters itself in `base-content`, the theme's periwinkle, which on a
					bar that forces white over terrain reads as a stray colour, and its hover fills the
					square with the surface and takes the rule with it, so the mark loses the very thing
					it is. White at 60%, brightening to white on a wash of it — the same answer to the
					pointer the crumbs beside it give. -->
				<div class="flex items-center gap-2">
					<button
						type="button"
						class="btn btn-square btn-outline btn-sm flex-none border-white/60 text-white hover:border-white hover:bg-white/10 hover:text-white"
						aria-expanded={expanded}
						aria-label="Show the whole path"
						on:click={() => (expanded = !expanded)}
					>
						<svg viewBox="0 0 24 24" fill="currentColor" class="size-4" aria-hidden="true">
							<circle cx="12" cy="5" r="2" />
							<circle cx="12" cy="12" r="2" />
							<circle cx="12" cy="19" r="2" />
						</svg>
					</button>
					<!-- The one step kept, in whatever the button leaves of the row, and cut short with
						an ellipsis if even that is not enough: there is no longer path to fold away, so
						the alternative is a name running out under the search box beside it. The whole
						of it is a press away, in the column. -->
					<div aria-current="page" class="min-w-0 flex-1">
						<MapBreadcrumb
							label={lastCrumb?.label ?? ''}
							showName={lastCrumb?.showName ?? null}
							showId={lastCrumb?.showId ?? null}
							tileClasses={lastCrumb?.tileClasses ?? null}
							current
							truncated
						/>
					</div>
				</div>
			{:else}
				<div class="breadcrumbs py-0 text-sm">
					<ul>
						{#each crumbs as crumb, i}
							<li>
								{#if i === crumbs.length - 1}
									<!-- The step the map is on. `aria-current` and not a control: it is where you
										already are, so there is nowhere for it to go — which is also why it undoes
										DaisyUI's `cursor: pointer`, put on every child of an `li` on the assumption
										that a crumb is a link. -->
									<span aria-current="page" class="cursor-default hover:no-underline">
										<MapBreadcrumb
											label={crumb.label}
											showName={crumb.showName ?? null}
											showId={crumb.showId ?? null}
											tileClasses={crumb.tileClasses ?? null}
											current
										/>
									</span>
								{:else}
									<!-- A step back up the path. Not underlined on hover, which is what DaisyUI does
										to a crumb and what the `link` class here used to add on top: an underline drawn
										across a tile and two lines of type reads as a rule struck through the crumb
										rather than as a word that can be pressed. What answers the pointer is the crumb
										lifting onto a surface of its own instead. -->
									<button
										type="button"
										class="-mx-1 rounded-md px-1 py-0.5 hover:bg-white/10 hover:no-underline"
										on:click={() => pick(crumb.key)}
									>
										<MapBreadcrumb
											label={crumb.label}
											showName={crumb.showName ?? null}
											showId={crumb.showId ?? null}
											tileClasses={crumb.tileClasses ?? null}
										/>
									</button>
								{/if}
							</li>
						{/each}
					</ul>
				</div>
			{/if}
		</div>

		<!-- Never squeezed by the path: the crumbs are what gives way, since they collapse and
			an input cannot. -->
		{#if $$slots.end}
			<div class="flex-none">
				<slot name="end" />
			</div>
		{/if}
	</div>

	{#if collapsed && expanded}
		<!-- The whole path, root first, down a single column: what a row could not hold in one
			line it holds in as many lines as there are steps. It slides out from under the bar
			and stands over the map rather than pushing the plates below it down — the column is
			the bar being read, not another plate in the stack, and the corner underneath it is
			where you were before you asked. Its own width, not the bar's: a column of place
			names is as wide as the longest of them. The one surface here not let through: the bar
			can be 80% of itself because a crumb or two is read against terrain, but a column of
			five is read against whatever plate it has come down on top of. -->
		<div
			transition:slide={{ duration: 200 }}
			class="absolute left-0 top-full z-10 mt-2 flex w-max max-w-full flex-col gap-0.5 overflow-hidden rounded-lg bg-base-100 p-2 text-white shadow-xl"
		>
			{#each crumbs as crumb, i}
				{#if i === crumbs.length - 1}
					<span aria-current="page" class="rounded-md px-2 py-1">
						<MapBreadcrumb
							label={crumb.label}
							showName={crumb.showName ?? null}
							showId={crumb.showId ?? null}
							tileClasses={crumb.tileClasses ?? null}
							current
						/>
					</span>
				{:else}
					<button
						type="button"
						class="rounded-md px-2 py-1 text-left hover:bg-white/10"
						on:click={() => pick(crumb.key)}
					>
						<MapBreadcrumb
							label={crumb.label}
							showName={crumb.showName ?? null}
							showId={crumb.showId ?? null}
							tileClasses={crumb.tileClasses ?? null}
						/>
					</button>
				{/if}
			{/each}
		</div>
	{/if}
</div>
