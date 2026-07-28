<script lang="ts">
	import classNames from 'classnames';
	import { onMount } from 'svelte';
	import { _, locale } from 'svelte-i18n';
	import { characters } from '@3xl/data';
	import { authService } from '$services/auth.service';
	import { spawnService } from '$services/spawn.service';
	import { avatarPickerOpen } from '$services/avatarPicker';
	import { AuthStatus } from '$types/profile.type';
	import CharacterFace from '$components/core/CharacterFace.svelte';
	import { characterFace, type CharacterFace as Face } from '$utils/mugen/character-face';
	import {
		PRIDE_SPAWN_COLORS,
		avatarCharacterIds,
		ownedColorsByCharacter
	} from '$utils/spawn/avatar';
	import { SpawnColor } from '$types/character-spawn.type';

	const status = authService.status;
	const profile = authService.profile;
	const spawns = spawnService.spawns;

	// character id → its active face portrait with the square framed on it, the
	// very ones the admin picked and cropped on /characters/faces. Loaded once,
	// the first time the modal is opened.
	let faces = new Map<string, Face>();
	let loading = false;
	let loaded = false;
	// The player's cards, loaded once per signed-in player — they decide which
	// portraits are wearable at all, so the grid waits for them too rather than
	// flashing every tile as locked.
	let spawnsLoadedFor: string | null = null;
	let spawnsLoading = false;
	// The character being saved, so only its own tile spins.
	let saving: string | null = null;
	let errorMessage: string | null = null;

	onMount(() => authService.init());

	$: signedIn = $status === AuthStatus.SignedIn && !!$profile;
	$: open = signedIn && $avatarPickerOpen;
	$: currentUserId = signedIn && $profile ? String($profile.id) : null;
	$: if (open && !loaded && !loading) void loadFaces();
	$: if (open && currentUserId && currentUserId !== spawnsLoadedFor) {
		spawnsLoadedFor = currentUserId;
		spawnsLoading = true;
		void spawnService
			.loadSpawns(currentUserId)
			.catch(() => {})
			.finally(() => (spawnsLoading = false));
	}

	// The same swatches the portrait rings and the card scene use.
	const colorClasses: Record<SpawnColor, string> = {
		[SpawnColor.Red]: 'bg-red-500',
		[SpawnColor.Yellow]: 'bg-yellow-400',
		[SpawnColor.Blue]: 'bg-blue-500',
		[SpawnColor.Orange]: 'bg-orange-500',
		[SpawnColor.Green]: 'bg-green-500',
		[SpawnColor.Purple]: 'bg-purple-500'
	};

	// A portrait is earned, not just picked: the player must hold that character in
	// all six spawn colours. The `set_player_avatar` RPC enforces the same rule, so
	// a locked tile is one the server would refuse.
	$: ownedColors = ownedColorsByCharacter($spawns);
	$: unlocked = avatarCharacterIds($spawns);

	// Only characters that actually ship a portrait can be worn as one, the ones
	// the player has completed the colour set of first.
	$: pickable = characters
		.filter((character) => faces.has(character.id))
		.sort((a, b) => Number(unlocked.has(b.id)) - Number(unlocked.has(a.id)));

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
		if (saving || !unlocked.has(characterId)) return;
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

			{#if (loading && !loaded) || spawnsLoading}
				<div class="flex items-center gap-2 py-8 opacity-70">
					<span class="loading loading-spinner loading-sm"></span>
					<span class="text-sm">{$_('common.loading')}</span>
				</div>
			{:else}
				<div class="mt-4 grid max-h-[60vh] grid-cols-3 gap-3 overflow-y-auto sm:grid-cols-4 md:grid-cols-5">
					{#each pickable as character (character.id)}
						{@const selected = $profile?.avatarCharacterId === character.id}
						{@const locked = !unlocked.has(character.id)}
						<button
							type="button"
							class={classNames(
								'flex flex-col items-center gap-1 rounded-box border-2 p-2 transition',
								{
									'border-primary ring-2 ring-primary': selected,
									'border-transparent': !selected,
									'hover:border-base-300 hover:bg-base-200': !selected && !locked
								}
							)}
							title={locked ? $_('profile.avatar.locked') : character.label}
							disabled={locked || saving !== null}
							on:click={() => pick(character.id)}
						>
							<div class={classNames('relative', { 'opacity-40': locked })}>
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
							{#if locked}
								{@const owned = ownedColors.get(character.id)}
								<div class="flex w-20 overflow-hidden rounded-full">
									{#each PRIDE_SPAWN_COLORS as color (color)}
										<span
											class={classNames('h-1.5 flex-1', colorClasses[color], {
												'opacity-50': !owned?.has(color)
											})}
										></span>
									{/each}
								</div>
							{/if}
							<span
								class={classNames('w-full truncate text-center text-xs', {
									'opacity-40': locked
								})}>{character.label}</span
							>
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
