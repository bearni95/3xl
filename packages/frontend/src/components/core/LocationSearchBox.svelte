<script lang="ts">
	import classNames from 'classnames';
	import { tick } from 'svelte';
	import { _ } from 'svelte-i18n';

	// The way to look for a place, at the far end of the breadcrumb bar. It is a mark until it
	// is asked for: a field wide enough to type a town into is the widest thing on that row and
	// it was holding that width whether or not anybody was searching — the row it stands in is
	// about where the map is looking, and the path saying so is the part that gives way when
	// there is not enough of it. So the field is folded into the one glyph that means it, and
	// the crumbs get the row back until it is pressed.
	//
	// The glyph is game-icons.net's looking glass, drawn the way the collapsed path's dots
	// button beside it is drawn: an outlined 32px square, white at 60% brightening to white on
	// a wash of it, since the bar forces white over terrain and the theme's own outline colours
	// would read as a stray one. It is an <img> and not inlined markup because these glyphs
	// carry a baked white fill for the canvas to tint (see CLAUDE.md) — which is exactly the
	// colour this bar wants anyway.

	/** What is being searched for. Bound: the plate listing the matches is the caller's. */
	export let value: string = '';
	// Whether the field is out. Never true with the button up — the two are the one control in
	// its two states, not a field that a button opens beside it. Bound out because the plate of
	// matches has a way out of its own (its cross), and ending the search there has to fold the
	// field the press was not made on.
	export let open: boolean = false;
	export let classes: string = '';

	let inputEl: HTMLInputElement | null = null;

	async function reveal() {
		open = true;
		// The press was the start of typing, so the caret is put where the press said it should
		// be rather than asking for a second one. `tick` because the field does not exist yet.
		await tick();
		inputEl?.focus();
	}

	// Left empty, it folds itself back up: an empty field is the button with extra width, and
	// nothing is lost by taking that width back. Left with a query it stays out, because the
	// matches below are being read against what is typed and there would be no way to see, let
	// alone edit, what had produced them.
	function handleBlur() {
		if (!value.trim()) open = false;
	}

	// Escape is the way back out with a query in hand: it drops the query, which is what folds
	// the matches away too, and then folds the field.
	function handleKeydown(event: KeyboardEvent) {
		if (event.key !== 'Escape') return;
		value = '';
		open = false;
	}
</script>

{#if open}
	<input
		bind:this={inputEl}
		type="search"
		class={classNames('input input-bordered input-sm w-40 sm:w-56', classes)}
		placeholder={$_('map.search.placeholder')}
		bind:value
		on:blur={handleBlur}
		on:keydown={handleKeydown}
	/>
{:else}
	<button
		type="button"
		class={classNames(
			'btn btn-square btn-outline btn-sm flex-none border-white/60 text-white hover:border-white hover:bg-white/10 hover:text-white',
			classes
		)}
		aria-label={$_('map.search.label')}
		on:click={reveal}
	>
		<img src="/assets/icons/lorc/magnifying-glass.svg" class="size-4" alt="" />
	</button>
{/if}
