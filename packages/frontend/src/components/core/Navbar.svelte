<script lang="ts">
	import classNames from 'classnames';
	import { page } from '$app/stores';
	import { getRoutes } from '$utils/routes/get-routes';
	import NavMenu from '$components/core/NavMenu.svelte';
	import AuthMenu from '$components/core/AuthMenu.svelte';
	import type { RouteNode } from '$types/navigation.type';

	export let brand: string = '6XL.net';
	export let classes: string = '';

	const routes: RouteNode[] = getRoutes();

	// Path of the top-level node whose submenu is currently unfolded.
	let openPath: string | null = null;

	$: current = $page.url.pathname;

	function isActive(node: RouteNode): boolean {
		if (current === node.path) return true;
		return node.path !== '/' && current.startsWith(`${node.path}/`);
	}

	function toggle(node: RouteNode): void {
		openPath = openPath === node.path ? null : node.path;
	}

	function close(): void {
		openPath = null;
	}
</script>

<svelte:window on:keydown={(e) => e.key === 'Escape' && close()} />

<nav class={classNames('navbar bg-base-100 shadow-sm', classes)}>
	<div class="navbar-start">
		<a href="/" class="btn btn-ghost text-xl" on:click={close}>{brand}</a>
	</div>

	<div class="navbar-center">
		<ul class="menu menu-horizontal gap-1 px-1">
			{#each routes as node (node.path)}
				<li>
					{#if node.children.length}
						<!-- Parent route: the button unfolds its subroutes. -->
						<div class="dropdown dropdown-bottom">
							<button
								type="button"
								class={classNames('btn btn-ghost btn-sm', {
									'btn-active': isActive(node) || openPath === node.path
								})}
								aria-haspopup="true"
								aria-expanded={openPath === node.path}
								on:click={() => toggle(node)}
							>
								{node.label}
								<svg
									class={classNames('h-3 w-3 transition-transform', {
										'rotate-180': openPath === node.path
									})}
									xmlns="http://www.w3.org/2000/svg"
									viewBox="0 0 20 20"
									fill="currentColor"
								>
									<path
										fill-rule="evenodd"
										d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
										clip-rule="evenodd"
									/>
								</svg>
							</button>
							{#if openPath === node.path}
								<div
									class="dropdown-content z-10 mt-1 rounded-box bg-base-100 shadow-lg"
								>
									<NavMenu nodes={node.children} on:navigate={close} />
									{#if node.hasPage}
										<div class="px-2 pb-2">
											<a
												href={node.path}
												class="btn btn-ghost btn-sm w-full justify-start"
												on:click={close}
											>
												Go to {node.label}
											</a>
										</div>
									{/if}
								</div>
							{/if}
						</div>
					{:else}
						<!-- Leaf route: the button navigates directly. -->
						<a
							href={node.path}
							class={classNames('btn btn-ghost btn-sm', { 'btn-active': isActive(node) })}
							on:click={close}
						>
							{node.label}
						</a>
					{/if}
				</li>
			{/each}
		</ul>
	</div>

	<div class="navbar-end gap-1">
		<AuthMenu />
	</div>
</nav>

<!-- Click-away layer to close an open submenu. -->
{#if openPath}
	<button
		type="button"
		class="fixed inset-0 z-0 cursor-default"
		tabindex="-1"
		aria-label="Close menu"
		on:click={close}
	></button>
{/if}
