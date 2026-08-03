<script lang="ts">
	import { onMount } from 'svelte';

	// The other half of the splash: the shell (`app.html`) puts it up, this takes it down.
	//
	// It is drawn there because it has to be on screen before there is an app at all — see
	// the comment on that element — which leaves exactly one thing the document cannot
	// answer for itself: when the app it is covering has arrived. That is what this is.
	// It renders nothing, and there is deliberately no Svelte copy of the splash to render:
	// two copies would mean the video restarting the moment the second one mounted.
	//
	// The wait is counted from the mount rather than from the load, so the splash always
	// stands for at least as long as it takes the bundle to boot, plus this — never less.

	const SPLASH_MS = 500;
	const SPLASH_ID = 'splash';

	onMount(() => {
		const timer = setTimeout(() => document.getElementById(SPLASH_ID)?.remove(), SPLASH_MS);
		return () => clearTimeout(timer);
	});
</script>
