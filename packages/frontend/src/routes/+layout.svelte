<script lang="ts">
	import '../css/app.css';
	import AvatarPickerModal from '$components/core/AvatarPickerModal.svelte';
	import SettingsModal from '$components/core/SettingsModal.svelte';
	import SignInModal from '$components/core/SignInModal.svelte';
	import LegalModal from '$components/core/LegalModal.svelte';
	import LegalGate from '$components/core/LegalGate.svelte';
	import SplashScreen from '$components/core/SplashScreen.svelte';

	let { children } = $props();
</script>

{@render children?.()}
<AvatarPickerModal />
<SettingsModal />
<!-- The way in, out here with the rest of them: the corner at the foot of the map is one
	button now, and everything it asks is asked on this box. Out here it also survives the
	documents being read over it, which is the whole reason a visitor can tick the gate and
	still go and see what they are ticking. -->
<SignInModal />
<!-- The legal documents, and the gate that asks for them again when they have moved
	under a player. Both live out here for the reason every other modal does — raised from
	inside the map's pinned panel they would be trapped in its stacking context — and this
	pair especially, since the sign-in that links to them is a modal itself. The sheet is
	mounted last of the four so it stands over the others: reading a document the gate is
	asking about must not mean dismissing the gate. -->
<LegalGate />
<LegalModal />
<!-- Draws nothing: it clears the splash the shell put up, 500ms after this layout mounts.
	Out here because the splash covers the whole app rather than any one route. -->
<SplashScreen />
