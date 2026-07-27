<script lang="ts">
	import UsersManager from '$components/core/UsersManager.svelte';
</script>

<div class="min-h-[calc(100vh-4rem)] bg-base-200 p-6">
	<div class="mx-auto max-w-6xl">
		<div class="mb-4">
			<h1 class="text-2xl font-bold">Players</h1>
			<p class="text-sm opacity-70">
				The signed-up players, and their daily booster-claim standing. Grant extra claims for today.
			</p>
		</div>
		<UsersManager />
	</div>
</div>
