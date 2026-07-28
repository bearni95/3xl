<script lang="ts">
	import classNames from 'classnames';
	import { onMount } from 'svelte';
	import { _, locale } from 'svelte-i18n';
	import { characters } from '@3xl/data';
	import { authService } from '$services/auth.service';
	import { avatarPickerOpen } from '$services/avatarPicker';
	import { AuthStatus } from '$types/profile.type';
	import CharacterFace from '$components/core/CharacterFace.svelte';
	import { characterFace, type CharacterFace as Face } from '$utils/mugen/character-face';

	const status = authService.status;
	const profile = authService.profile;

	// character id → its active face portrait with the square framed on it, the
	// very ones the admin picked and cropped on /characters/faces. Loaded once,
	// the first time the modal is opened.
	let faces = new Map<string, Face>();
	let loading = false;
	let loaded = false;
	// The character being saved, so only its own tile spins.
	let saving: string | null = null;
	let errorMessage: string | null = null;

	onMount(() => authService.init());

	$: signedIn = $status === AuthStatus.SignedIn && !!$profile;
	$: open = signedIn && $avatarPickerOpen;
	$: if (open && !loaded && !loading) void loadFaces();

	// Only characters that actually ship a portrait can be worn as one.
	$: pickable = characters.filter((character) => faces.has(character.id));

	async function loadFaces(): Promise<void> {
		loading = true;
		try {
			const resolved = await Promise.all(
				characters.map(async (character) => {
					try {
						return [character.id, await characterFace(character.id, character.basePath)] as const;
					} catch {
						return [character.id, null] as const;
					}
				})
			);
			const next = new Map<string, Face>();
			for (const [id, face] of resolved) if (face) next.set(id, face);
			faces = next;
			loaded = true;
		} finally {
			loading = false;
		}
	}

	async function pick(characterId: string): Promise<void> {
		if (saving) return;
		errorMessage = null;
		saving = characterId;
		try {
			await authService.setAvatar(characterId);
			close();
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : $_('errors.generic');
		} finally {
			saving = null;
		}
	}

	function close(): void {
		avatarPickerOpen.set(false);
		errorMessage = null;
	}
</script>

{#if open && $locale}
	<div class="modal modal-open" role="dialog" aria-modal="true">
		<div class="modal-box max-w-3xl">
			<h3 class="text-lg font-semibold">{$_('profile.avatar.title')}</h3>

			{#if loading && !loaded}
				<div class="flex items-center gap-2 py-8 opacity-70">
					<span class="loading loading-spinner loading-sm"></span>
					<span class="text-sm">{$_('common.loading')}</span>
				</div>
			{:else}
				<div class="mt-4 grid max-h-[60vh] grid-cols-3 gap-3 overflow-y-auto sm:grid-cols-4 md:grid-cols-5">
					{#each pickable as character (character.id)}
						{@const selected = $profile?.avatarCharacterId === character.id}
						<button
							type="button"
							class={classNames(
								'flex flex-col items-center gap-1 rounded-box border-2 p-2 transition',
								{
									'border-primary ring-2 ring-primary': selected,
									'border-transparent hover:border-base-300 hover:bg-base-200': !selected
								}
							)}
							disabled={saving !== null}
							on:click={() => pick(character.id)}
						>
							<div class="relative">
								<div class="h-20 w-20 overflow-hidden rounded-md bg-base-300">
									<CharacterFace face={faces.get(character.id) ?? null} alt={character.label} />
								</div>
								{#if saving === character.id}
									<span
										class="absolute inset-0 flex items-center justify-center rounded-md bg-base-100/70"
									>
										<span class="loading loading-spinner loading-sm"></span>
									</span>
								{/if}
							</div>
							<span class="w-full truncate text-center text-xs">{character.label}</span>
						</button>
					{/each}
				</div>
			{/if}

			{#if errorMessage}
				<div class="alert alert-error mt-4">
					<span>{errorMessage}</span>
				</div>
			{/if}

			<div class="modal-action">
				<button type="button" class="btn btn-ghost" disabled={saving !== null} on:click={close}>
					{$_('common.close')}
				</button>
			</div>
		</div>
		<button
			type="button"
			class="modal-backdrop"
			aria-label={$_('common.close')}
			on:click={close}
		></button>
	</div>
{/if}
