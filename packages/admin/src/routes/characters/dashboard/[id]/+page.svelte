<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';

	// A character has no single detail view, so the bare URL stands for the first
	// of the four: land on the definition, and replace this entry so Back leaves
	// the character rather than bouncing through here.
	onMount(() => {
		goto(`/characters/dashboard/${$page.params.id}/definition`, { replaceState: true });
	});
</script>
