<script lang="ts">
	import classNames from 'classnames';
	import { onMount } from 'svelte';
	import { _ } from 'svelte-i18n';

	// The field a place is looked for in, on the strip across the top of the terrain. It stood at
	// the far end of the breadcrumb bar, folded into a looking glass because a field wide enough
	// to type a town into was the widest thing on a row whose subject is where the map is looking.
	// There is no path on this strip to compete with: the looking glass is the last cell of the
	// shares grid (see +page.svelte), and pressing it brings this field down on the row under it,
	// the width of the shares it came out of.
	//
	// So this is the field alone now, mounted only while the search is open — which is what
	// makes the focus a mount and not a `tick` after a state change: the press that opened it
	// was the start of typing, and the caret is put where that press said it should be.

	/** What is being searched for. Bound: the list of matches is the caller's. */
	export let value: string = '';
	// Whether the field is out. The caller raises it (the glyph is theirs); this is how the
	// field puts itself away — left empty, or dismissed with Escape.
	export let open: boolean = true;
	export let classes: string = '';

	let inputEl: HTMLInputElement | null = null;

	onMount(() => inputEl?.focus());

	// Left empty, it folds itself back up: an empty field is a row of nothing, and the shares it
	// is standing in front of are worth more than it is. Left with a query it stays out, because
	// the matches below are being read against what is typed and there would be no way to see,
	// let alone edit, what had produced them.
	function handleBlur() {
		if (!value.trim()) open = false;
	}

	// Escape is the way back out with a query in hand: it drops the query, which is what takes
	// the matches away too, and then folds the field.
	function handleKeydown(event: KeyboardEvent) {
		if (event.key !== 'Escape') return;
		value = '';
		open = false;
	}
</script>

<input
	bind:this={inputEl}
	type="search"
	class={classNames('input input-bordered input-sm w-full', classes)}
	placeholder={$_('map.search.placeholder')}
	bind:value
	on:blur={handleBlur}
	on:keydown={handleKeydown}
/>
