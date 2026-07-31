<script lang="ts">
	import '../css/app.css';
	import AvatarPickerModal from '$components/core/AvatarPickerModal.svelte';
	import SettingsModal from '$components/core/SettingsModal.svelte';
	import LegalModal from '$components/core/LegalModal.svelte';
	import LegalGate from '$components/core/LegalGate.svelte';

	let { children } = $props();
</script>

{@render children?.()}
<AvatarPickerModal />
<SettingsModal />
<!-- The legal documents, and the gate that asks for them again when they have moved
	under a player. Both live out here for the reason every other modal does — raised from
	inside the map's pinned panel they would be trapped in its stacking context — and this
	pair especially, since the sign-in that links to them is itself inside that panel. The
	sheet is mounted last of the three so it stands over the gate: reading a document the
	gate is asking about must not mean dismissing the gate. -->
<LegalGate />
<LegalModal />
