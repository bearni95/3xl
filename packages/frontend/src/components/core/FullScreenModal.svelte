<script lang="ts">
	import classNames from 'classnames';
	import { createEventDispatcher, onMount } from 'svelte';
	import { fly } from 'svelte/transition';
	import { dropSheet, raiseSheet } from '$services/fullScreenModal';

	// The chrome every full-view modal over the map wears: the sheet, the way it
	// arrives and leaves, its title bar and the two ways out of it. What each one
	// puts inside is the only thing that differs, so the surround is here and the
	// content is the slot.
	//
	// A modal like this is the whole view rather than a box over the map: it takes
	// the viewport and slides up from the bottom edge to do it, and slides back down
	// on the way out. Nothing behind it is dimmed and there is no backdrop to click,
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
	 * still showing, and which leans the map back to say so (`tiltsMap`) — a movement there is
	 * no point making behind a page nine tenths opaque.
	 *
	 * Every other full view is content to read and keeps its page. What a sheet gives up with
	 * it is the ground under its own words: a transparent sheet's content must carry its own
	 * fill wherever it letters anything, or it is read off live terrain.
	 */
	export let transparent: boolean = false;
	/**
	 * Lean the map back while this sheet is up, on top of the blur every sheet gets.
	 *
	 * The one sheet that asks for it is the combat arena: a fight is the only full view here
	 * that is not a reading of the map but an event happening *on* it, over a town the map is
	 * still showing, so the map gives ground for it — it tips away as the arena comes up and
	 * comes back level as the arena leaves. A leaderboard or a roster is a page laid over the
	 * map and asks the map for nothing.
	 *
	 * Said as a prop rather than read off the arena, so it starts and ends on this sheet's own
	 * mount and unmount — which is what the blur is timed off — and the map makes one movement
	 * instead of two that nearly line up (see `$services/fullScreenModal`, and WorldMap's
	 * `tilted`).
	 */
	export let tiltsMap: boolean = false;

	const dispatch = createEventDispatcher<{ close: void }>();

	// Say that a sheet is up for exactly as long as this one is mounted, so the map behind it
	// can blur its own chrome away (see `$services/fullScreenModal`, and the root page). It is
	// said from here rather than by each host, because "a full view is over the map" is a fact
	// about this sheet and not about the five stores that raise one. The unmount runs after the
	// slide-out has played, which is when the map is worth reading again.
	//
	// Raised and dropped with the same value, captured once: `tiltsMap` is what the sheet was
	// mounted as and a host that changed it mid-fight would otherwise leave the tilt count one
	// off for the rest of the session. The pair is onMount's own teardown rather than a separate
	// onDestroy, so a drop can never happen without its raise (onDestroy alone runs on the
	// server, where nothing was ever mounted).
	const tilt = tiltsMap;
	onMount(() => {
		raiseSheet(tilt);
		return () => dropSheet(tilt);
	});

	function close(): void {
		if (closeDisabled) return;
		dispatch('close');
	}

	function onKeydown(event: KeyboardEvent): void {
		if (event.key === 'Escape') close();
	}
</script>

<svelte:window on:keydown={onKeydown} />

<div
	class="fixed inset-0 z-[1300]"
	role="dialog"
	aria-modal="true"
	aria-label={title}
	transition:fly={{ y: '100%', duration: 250, opacity: 1 }}
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
