<script lang="ts">
	import classNames from 'classnames';
	import { createEventDispatcher, onMount } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	import { dropSheet, raiseSheet } from '$services/fullScreenModal';

	// The chrome every full-view modal over the map wears: the sheet, the way it
	// arrives and leaves, its title bar and the two ways out of it. What each one
	// puts inside is the only thing that differs, so the surround is here and the
	// content is the slot.
	//
	// A modal like this is the whole view rather than a box over the map: it takes
	// the viewport and slides up from the bottom edge to do it, and slides back down
	// on the way out — or fades, where what it is holding is worth leaving where it is
	// (see `fadeOut`). Nothing behind it is dimmed and there is no backdrop to click,
	// because there is nothing of the map left showing to click at — Escape and the ✕
	// are how it closes.
	//
	// The page is not quite opaque all the way down: base-100 at full strength at the
	// top, graded to nine tenths at the foot, so the map is faintly there under the
	// last of the content and the view reads as something laid over the map rather
	// than as another screen. It is the gradient alone that paints it — a background
	// colour under a stop with alpha in it would show through and make the foot opaque
	// again, which is the whole of what the grade says. `transparent` takes even that
	// away — see the prop.
	//
	// The slide is a Svelte transition rather than a stylesheet's, since the component
	// is only ever mounted while it is open (a CSS transition has nothing to animate
	// from on a fresh mount) and the host's `{#if}` is what lets the way out play at
	// all. So this component has no `open` prop: it exists while the modal is up, it
	// dispatches `close`, and the host's store is what decides.
	//
	// z-[1300] puts it above the map's pinned panel (z-[900]). The combat arena wears
	// this same sheet, so two of these can be up at once — the arena is one of the
	// places that sends the player to the roster — and which of them is in front is
	// decided by the order the page mounts them in, the roster being the later. The
	// sheet is a full-height flex column: the title bar takes what it needs and the
	// slot gets the rest, which is what a scroll box inside it is sized from. A `bare`
	// sheet has neither the bar nor the padding round it — the slot is the viewport, and
	// Escape is the way out.

	/** The heading in the title bar, and the sheet's name to a screen reader whether that
	 * bar is drawn or not. */
	export let title: string;
	/** What the ✕ is called to a screen reader, e.g. `Close roster`. */
	export let closeLabel: string = 'Close';
	/**
	 * Give the whole sheet over to the slot: no title bar, and no padding around it.
	 *
	 * For a view whose content *is* the view — one drawing that wants every pixel it can
	 * have and sizes itself to what it is given — where a bar naming it and a margin round
	 * it are both chrome taken off the thing the player came for. A padded sheet with a
	 * heading is the right shape for a page of content and the wrong one for a single
	 * picture.
	 *
	 * Escape is unaffected: it is bound to the window, not to the bar, so a bare sheet is
	 * still a sheet that closes — and `closeDisabled` still holds it shut. The title is
	 * still given, and is still the sheet's name to a screen reader.
	 */
	export let bare: boolean = false;
	/**
	 * Hold the way out shut: the ✕ greys and Escape does nothing while this is true.
	 *
	 * For a view that is in the middle of something the player must not walk out of —
	 * the combat arena handing a finished fight to the server, which is what ends the
	 * battle — rather than for keeping anybody in. It is the host that knows when that
	 * is, so it is the host that says.
	 */
	export let closeDisabled: boolean = false;
	/**
	 * Paint no page at all: the sheet keeps its size, its bar and its way out, and the map
	 * is simply behind the content rather than behind a grade of base-100.
	 *
	 * Two sheets ask for this, and for the same reason. The booster window, whose content is a
	 * canvas of boxes with nothing between them — a pack is stood up and sliced open over the
	 * town it came from, and a page under it, even a graded one, is a screen the opening happens
	 * on instead of on the map. And the combat arena, which is a fight over a town the map is
	 * still showing rather than a page laid over it.
	 *
	 * Every other full view is content to read and keeps its page. What a sheet gives up with
	 * it is the ground under its own words: a transparent sheet's content must carry its own
	 * fill wherever it letters anything, or it is read off live terrain.
	 */
	export let transparent: boolean = false;
	/**
	 * Make the whole sheet a way out: a click anywhere on it closes, and leaves by the same
	 * slide the ✕ and Escape leave by.
	 *
	 * For a view that has finished saying what it was raised to say and has nothing left to do —
	 * the booster window once a pack has come apart and its cards are standing there. The player
	 * has looked; the next thing they do, wherever they do it, is done with it. It is the host
	 * that knows when a sheet has reached that point, so it is the host that says, and it is off
	 * until they do: a sheet that closed on any click would be a sheet nothing inside could be
	 * touched on.
	 *
	 * `closeDisabled` still wins, as it does over both other ways out.
	 */
	export let closeOnClick: boolean = false;
	/**
	 * Leave by fading rather than by sliding back down.
	 *
	 * A sheet slides up from the bottom edge and slides back down because the movement says
	 * where the view came from and where it has gone — it is the map's own furniture being
	 * pulled up over it and let down again. That reading holds for a view being dismissed. It
	 * does not hold for one that has finished: the booster window once a pack has come apart
	 * and its cards are standing there, where sliding takes the cards somebody is still looking
	 * at and posts them off the bottom of the screen. Fading leaves them where they are and
	 * simply stops showing them, and what comes up underneath is the town they were pulled on.
	 *
	 * Same length either way, so nothing that was timed against the slide has to be told (see
	 * the page's SHEET_EXIT, and the blur the map's chrome comes back on).
	 */
	export let fadeOut: boolean = false;

	// How long the sheet takes to arrive and to go, whichever way it goes.
	const SHEET_MS = 250;

	// The way out is chosen when it plays rather than when the sheet is built, which is the whole
	// point: a sheet is raised long before anybody knows whether it will be dismissed or finished
	// with. A `transition:` directive is one way for both directions, so the two are written
	// apart — the way in is always the slide.
	function leave(node: Element, params: { faded: boolean }) {
		return params.faded
			? fade(node, { duration: SHEET_MS })
			: fly(node, { y: '100%', duration: SHEET_MS, opacity: 1 });
	}

	const dispatch = createEventDispatcher<{ close: void }>();

	// Say that a sheet is up for exactly as long as this one is mounted, so the map behind it
	// can blur its own chrome away (see `$services/fullScreenModal`, and the root page). It is
	// said from here rather than by each host, because "a full view is over the map" is a fact
	// about this sheet and not about the five stores that raise one. The unmount runs after the
	// slide-out has played, which is when the map is worth reading again.
	//
	// The pair is onMount's own teardown rather than a separate onDestroy, so a drop can never
	// happen without its raise (onDestroy alone runs on the server, where nothing was ever
	// mounted).
	onMount(() => {
		raiseSheet();
		return () => dropSheet();
	});

	function close(): void {
		if (closeDisabled) return;
		dispatch('close');
	}

	function onKeydown(event: KeyboardEvent): void {
		if (event.key === 'Escape') close();
	}

	// A click on the sheet, when the host has made the sheet a way out. It sits on the whole of it
	// rather than on the content, so the bar, the margin and whatever is drawn in the middle all
	// close alike — there is no part of a sheet that is done with that is not done with. The ✕
	// underneath it closes twice, which is once.
	function onSheetClick(): void {
		if (closeOnClick) close();
	}
</script>

<svelte:window on:keydown={onKeydown} />

<!-- svelte-ignore a11y-click-events-have-key-events -->
<div
	class="fixed inset-0 z-[1300]"
	role="dialog"
	aria-modal="true"
	aria-label={title}
	tabindex="-1"
	in:fly={{ y: '100%', duration: SHEET_MS, opacity: 1 }}
	out:leave={{ faded: fadeOut }}
	on:click={onSheetClick}
>
	<div
		class={classNames('flex h-full w-full flex-col overflow-hidden', {
			'bg-gradient-to-b from-base-100 to-base-100/90': !transparent,
			'gap-4 p-6': !bare
		})}
	>
		{#if !bare}
			<div class="flex flex-none items-center gap-3">
				<h2 class="text-lg font-bold">{title}</h2>
				<button
					type="button"
					class="btn btn-circle btn-ghost btn-sm ml-auto"
					aria-label={closeLabel}
					disabled={closeDisabled}
					on:click={close}
				>
					✕
				</button>
			</div>
		{/if}
		<slot />
	</div>
</div>
