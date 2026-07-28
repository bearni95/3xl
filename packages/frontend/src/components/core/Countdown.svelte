<script lang="ts">
	import classNames from 'classnames';
	import { createEventDispatcher, onMount } from 'svelte';
	import { formatDuration } from '$utils/time/format-duration';

	// The instant the countdown runs out at, epoch milliseconds.
	export let until: number;
	export let title: string = '';
	export let classes: string = '';

	const dispatch = createEventDispatcher<{ elapsed: void }>();

	// The tick lives here rather than in the page so only this readout re-renders
	// every second. Started on mount so a prerender never leaves a timer behind.
	let now = Date.now();
	onMount(() => {
		const timer = setInterval(() => (now = Date.now()), 1000);
		return () => clearInterval(timer);
	});

	$: remaining = Math.max(0, until - now);

	// Tell the parent the moment the deadline passes, so whatever the countdown was
	// holding closed can reopen without a reload. Once per deadline: `remaining`
	// stays at zero afterwards, and the tick would otherwise re-fire every second.
	let announcedFor: number | null = null;
	$: if (remaining === 0 && announcedFor !== until) {
		announcedFor = until;
		dispatch('elapsed');
	}
</script>

<span class={classNames('tabular-nums', classes)} {title}>
	{formatDuration(remaining)}
</span>
