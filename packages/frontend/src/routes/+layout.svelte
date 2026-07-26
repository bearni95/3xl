<script lang="ts">
	import '../css/app.css';
	import '$services/i18n';
	import Navbar from '$components/core/Navbar.svelte';
	import UsernameModal from '$components/core/UsernameModal.svelte';

	let { children } = $props();
</script>

<Navbar />
{@render children?.()}
<UsernameModal />
