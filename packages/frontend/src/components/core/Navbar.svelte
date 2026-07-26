<script lang="ts">
	import classNames from 'classnames';
	import { onMount } from 'svelte';
	import { locale } from 'svelte-i18n';
	import { page } from '$app/stores';
	import { getRoutes } from '$utils/routes/get-routes';
	import NavMenu from '$components/core/NavMenu.svelte';
	import ProfileCard from '$components/core/ProfileCard.svelte';
	import { authService } from '$services/auth.service';
	import type { RouteNode } from '$types/navigation.type';

	export let brand: string = '3XL';
	export let classes: string = '';

	const routes: RouteNode[] = getRoutes();
	const profile = authService.profile;

	// Path of the top-level node whose submenu is currently unfolded.
	let openPath: string | null = null;
	let signingOut = false;

	onMount(() => authService.init());

	$: current = $page.url.pathname;
	$: profileInitial = ($profile?.displayName || $profile?.email || '?').charAt(0).toUpperCase();

	async function handleSignOut(): Promise<void> {
		if (signingOut) return;
		signingOut = true;
		try {
			await authService.signOut();
		} finally {
			signingOut = false;
		}
	}

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

	<div class="navbar-end">
		{#if $profile}
			<!-- Signed-in username; hovering slides the profile card down. -->
			<div class="group relative">
				<button type="button" class="btn btn-ghost btn-sm gap-2">
					<div class="avatar avatar-placeholder">
						<div class="w-6 rounded-full bg-primary text-primary-content">
							<span class="text-xs">{profileInitial}</span>
						</div>
					</div>
					<span class="max-w-[10rem] truncate">{$profile.displayName}</span>
				</button>

				<!-- pt-2 keeps the hover area unbroken across the visual gap. -->
				<div
					class="invisible absolute right-0 top-full z-20 origin-top -translate-y-2 pt-2 opacity-0 transition duration-200 ease-out group-hover:visible group-hover:translate-y-0 group-hover:opacity-100"
				>
					<div class="card w-80 bg-base-100 shadow-xl">
						<div class="card-body">
							<!-- ProfileCard formats i18n messages; wait for the locale to load. -->
							{#if $locale}
								<ProfileCard profile={$profile} {signingOut} on:signout={handleSignOut} />
							{/if}
						</div>
					</div>
				</div>
			</div>
		{/if}
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
