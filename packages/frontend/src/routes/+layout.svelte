<script lang="ts">
	import '../css/app.css';
	import Navbar from '$components/core/Navbar.svelte';
	import UsernameModal from '$components/core/UsernameModal.svelte';
	import AvatarPickerModal from '$components/core/AvatarPickerModal.svelte';

	let { children } = $props();
</script>

<Navbar />
{@render children?.()}
<UsernameModal />
<AvatarPickerModal />
