<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { fly } from 'svelte/transition';

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
	// again, which is the whole of what the grade says.
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
	// slot gets the rest, which is what a scroll box inside it is sized from. Without
	// the bar (`titleBar`) the slot is the whole of it, and Escape is the way out.

	/** The heading in the title bar, and the sheet's name to a screen reader whether that
	 * bar is drawn or not. */
	export let title: string;
	/** What the ✕ is called to a screen reader, e.g. `Close roster`. */
	export let closeLabel: string = 'Close';
	/**
	 * Draw the title bar — the heading and the ✕ — or leave the sheet to its content.
	 *
	 * For a view whose content says what it is and carries its own way out, where a bar
	 * naming it again is a row of chrome over the thing the player came for. Escape is
	 * unaffected either way: it is bound to the window, not to the bar, so a sheet with no
	 * bar is still a sheet that closes — and `closeDisabled` still holds it shut.
	 */
	export let titleBar: boolean = true;
	/**
	 * Hold the way out shut: the ✕ greys and Escape does nothing while this is true.
	 *
	 * For a view that is in the middle of something the player must not walk out of —
	 * the combat arena handing a finished fight to the server, which is what ends the
	 * battle — rather than for keeping anybody in. It is the host that knows when that
	 * is, so it is the host that says.
	 */
	export let closeDisabled: boolean = false;

	const dispatch = createEventDispatcher<{ close: void }>();

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
		class="flex h-full w-full flex-col gap-4 overflow-hidden bg-gradient-to-b from-base-100 to-base-100/90 p-6"
	>
		{#if titleBar}
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
