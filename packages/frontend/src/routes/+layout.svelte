<script lang="ts">
	import '../css/app.css';
	import UsernameModal from '$components/core/UsernameModal.svelte';
	import AvatarPickerModal from '$components/core/AvatarPickerModal.svelte';
	import ProfileModal from '$components/core/ProfileModal.svelte';

	let { children } = $props();
</script>

{@render children?.()}
<UsernameModal />
<AvatarPickerModal />
<ProfileModal />
