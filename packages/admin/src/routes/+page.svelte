<script lang="ts">
	// Admin landing. The former /admin/* screens are now base routes of this app.
	const sections: { href: string; title: string; description: string }[] = [
		{
			href: '/characters',
			title: 'Characters',
			description:
				'Bind movement + combat animations, tune stats and colors, and save definitions straight into @3xl/data.'
		},
		{
			href: '/shows',
			title: 'Shows',
			description: 'Search TV shows on TMDB and browse every poster, backdrop and logo.'
		}
	];
</script>

<div class="min-h-screen bg-base-200 p-6 md:p-10">
	<div class="mx-auto flex max-w-4xl flex-col gap-6">
		<header class="flex flex-col gap-1">
			<h1 class="text-3xl font-bold">Admin</h1>
			<p class="text-sm opacity-70">Authoring tools for the 3XL character registry.</p>
		</header>

		<div class="grid gap-4 sm:grid-cols-2">
			{#each sections as section (section.href)}
				<a class="card bg-base-100 shadow-xl transition hover:shadow-2xl" href={section.href}>
					<div class="card-body gap-2">
						<h2 class="card-title">{section.title}</h2>
						<p class="text-sm opacity-70">{section.description}</p>
					</div>
				</a>
			{/each}
		</div>
	</div>
</div>
