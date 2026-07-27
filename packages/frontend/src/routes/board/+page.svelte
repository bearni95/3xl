<script lang="ts">
	import CombatArena from '$components/core/CombatArena.svelte';
</script>

<!-- The board page is just the combat arena on a full page: the player's active
     team fights a mirror of itself. The challenge variant (fighting a town's OG
     team) is hosted in a modal on the map page instead, so combat never navigates
     away from the map. -->
<div class="flex min-h-screen flex-col items-center justify-start gap-6 bg-base-200 p-4 sm:p-8">
	<CombatArena />
</div>
