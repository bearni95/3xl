<script lang="ts">
	import '../css/app.css';
	import AvatarPickerModal from '$components/core/AvatarPickerModal.svelte';
	import SettingsModal from '$components/core/SettingsModal.svelte';

	let { children } = $props();
</script>

{@render children?.()}
<AvatarPickerModal />
<SettingsModal />
