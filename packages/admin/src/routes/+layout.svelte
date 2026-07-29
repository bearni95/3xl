<script lang="ts">
	import '../css/app.css';
	import Sidebar from '$components/core/Sidebar.svelte';

	let { children } = $props();

	// Below `lg` the sidebar slides over the page; navigating puts it away again.
	let open = $state(false);
</script>

<div class="drawer lg:drawer-open">
	<input id="admin-sidebar" type="checkbox" class="drawer-toggle" bind:checked={open} />

	<div class="drawer-content flex min-h-screen flex-col">
		<label
			for="admin-sidebar"
			class="btn btn-ghost drawer-button m-2 w-fit lg:hidden"
			aria-label="Open menu"
		>
			<svg
				class="h-5 w-5"
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 0 20 20"
				fill="currentColor"
			>
				<path
					fill-rule="evenodd"
					d="M3 5.75A.75.75 0 013.75 5h12.5a.75.75 0 010 1.5H3.75A.75.75 0 013 5.75zm0 4.25a.75.75 0 01.75-.75h12.5a.75.75 0 010 1.5H3.75A.75.75 0 013 10zm0 4.25a.75.75 0 01.75-.75h12.5a.75.75 0 010 1.5H3.75a.75.75 0 01-.75-.75z"
					clip-rule="evenodd"
				/>
			</svg>
		</label>

		{@render children?.()}
	</div>

	<div class="drawer-side z-20">
		<label for="admin-sidebar" class="drawer-overlay" aria-label="Close menu"></label>
		<Sidebar on:navigate={() => (open = false)} />
	</div>
</div>
