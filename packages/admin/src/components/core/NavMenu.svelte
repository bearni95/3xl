<script lang="ts">
	import classNames from 'classnames';
	import { createEventDispatcher } from 'svelte';
	import { page } from '$app/stores';
	import type { RouteNode } from '$types/navigation.type';

	export let nodes: RouteNode[] = [];

	const dispatch = createEventDispatcher<{ navigate: void }>();

	$: current = $page.url.pathname;

	function isActive(node: RouteNode): boolean {
		return current === node.path;
	}

	/** A section is unfolded while the current page lives anywhere inside it. */
	function isOpen(node: RouteNode, path: string): boolean {
		return path === node.path || path.startsWith(`${node.path}/`);
	}
</script>

<!-- Renders the <li> rows only: the caller owns the <ul>, so a section's subtree
     nests as a plain child list inside its own <details>. -->
{#each nodes as node (node.path)}
	<li>
		{#if node.children.length}
			<details open={isOpen(node, current)}>
				<summary class={classNames({ 'menu-active': isActive(node) })}>
					{node.label}
				</summary>
				<ul>
					{#if node.hasPage}
						<li>
							<a
								href={node.path}
								class={classNames({ 'menu-active': isActive(node) })}
								on:click={() => dispatch('navigate')}
							>
								Overview
							</a>
						</li>
					{/if}
					<svelte:self nodes={node.children} on:navigate />
				</ul>
			</details>
		{:else}
			<a
				href={node.path}
				class={classNames({ 'menu-active': isActive(node) })}
				on:click={() => dispatch('navigate')}
			>
				{node.label}
			</a>
		{/if}
	</li>
{/each}
