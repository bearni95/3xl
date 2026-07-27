<script lang="ts">
	import '../css/app.css';
	import Navbar from '$components/core/Navbar.svelte';

	let { children } = $props();
</script>

<Navbar />
{@render children?.()}
