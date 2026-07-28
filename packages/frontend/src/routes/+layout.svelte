<script lang="ts">
	import '../css/app.css';
	import UsernameModal from '$components/core/UsernameModal.svelte';
	import AvatarPickerModal from '$components/core/AvatarPickerModal.svelte';

	let { children } = $props();
</script>

{@render children?.()}
<UsernameModal />
<AvatarPickerModal />
