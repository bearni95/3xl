<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { blur } from 'svelte/transition';

	// The other half of the splash: the shell (`app.html`) puts it up, this takes it down.
	//
	// It is drawn there because it has to be on screen before there is an app at all — see
	// the comment on that element — which leaves exactly one thing the document cannot
	// answer for itself: when the app it is covering has arrived. That is what this is.
	// There is deliberately no Svelte copy of the splash to draw: two copies would mean the
	// video restarting the moment the second one mounted, and the file fetched twice.
	//
	// The wait is counted from the mount rather than from the load, so the splash always
	// stands for at least as long as it takes the bundle to boot, plus this — never less.
	//
	// It used to end by calling `.remove()` on that element, which is a cut: one frame the
	// film, the next the map. Now it leaves the way the rest of this app leaves —
	// `transition:blur`, the same one the map's own chrome goes out on. A transition can
	// only run on an element Svelte itself made, so this **adopts** the shell's splash
	// instead of drawing anything: the node is moved, still playing, into a wrapper of its
	// own, which then blurs out and takes it with it when it goes. The move is synchronous,
	// which is what keeps the browser from pausing the video for having left the document.
	// The wrapper is fixed and full-screen because a filter makes it the containing block
	// for the fixed child inside it — a wrapper in flow would collapse the splash to
	// nothing at the very moment it is the only thing on screen.

	const SPLASH_MS = 500;
	const SPLASH_ID = 'splash';
	const SPLASH_BLUR = { amount: 8, duration: 600 };

	// Nothing is rendered until the shell's splash has actually been found, so no veil is
	// ever drawn over a page that never had one: off the root the shell has taken it down
	// already, and there is no document to ask at all when this is rendered server-side.
	let visible = $state(false);
	let host = $state<HTMLDivElement | undefined>();

	onMount(() => {
		const splash = document.getElementById(SPLASH_ID);
		if (!splash) return;

		let timer: ReturnType<typeof setTimeout> | undefined;
		visible = true;
		void tick().then(() => {
			host?.appendChild(splash);
			timer = setTimeout(() => (visible = false), SPLASH_MS);
		});

		return () => clearTimeout(timer);
	});
</script>

{#if visible}
	<div bind:this={host} class="fixed inset-0 z-[9999]" out:blur={SPLASH_BLUR}></div>
{/if}
