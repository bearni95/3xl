<script lang="ts">
	import classNames from 'classnames';
	import { onMount } from 'svelte';
	import { _, locale } from 'svelte-i18n';
	import { characters } from '@3xl/data';
	import { authService } from '$services/auth.service';
	import { avatarService } from '$services/avatar.service';
	import { spawnService } from '$services/spawn.service';
	import { avatarPickerOpen } from '$services/avatarPicker';
	import { AuthStatus } from '$types/profile.type';
	import PlayerAvatar from '$components/core/PlayerAvatar.svelte';
	import { avatarKey, avatarsByShow, isWornAvatar } from '$utils/spawn/avatar';
	import type { PlayerAvatar as Avatar } from '$types/player-avatar.type';

	// The player's avatars, and the choice of which one to wear.
	//
	// There is nothing to unlock here any more: an avatar is an item a booster box
	// dealt (a character *in a colour*), so this lists what the player holds and
	// nothing else — a portrait they do not own is not a locked tile, it is a tile
	// that does not exist, and `set_player_avatar` would refuse it anyway. Each tile
	// is the very component the profile row wears, so what is picked is what was
	// looked at.

	const status = authService.status;
	const profile = authService.profile;
	const avatars = avatarService.avatars;

	// The player's avatars, loaded once per signed-in player. The grids wait for them
	// rather than flashing "you hold none" at someone who holds several — and for the
	// show mapping with them, or a tile would start under "other" and jump to its show.
	let loadedFor: string | null = null;
	let loading = false;
	// character id → the Supabase shows it belongs to, the same mapping the roster
	// filters by. A failed load leaves it empty, which groups everything as unlisted.
	let characterShows = new Map<string, { id: number; name: string }[]>();
	// The avatar being saved, so only its own tile spins.
	let saving: string | null = null;
	let errorMessage: string | null = null;

	onMount(() => authService.init());

	$: signedIn = $status === AuthStatus.SignedIn && !!$profile;
	$: open = signedIn && $avatarPickerOpen;
	$: currentUserId = signedIn && $profile ? String($profile.id) : null;
	$: if (open && currentUserId && currentUserId !== loadedFor) {
		loadedFor = currentUserId;
		loading = true;
		void Promise.all([
			avatarService.load(currentUserId).catch(() => {}),
			spawnService
				.loadCharacterShows()
				.then((shows) => (characterShows = shows))
				.catch(() => {})
		]).finally(() => (loading = false));
	}

	// One grid per show, the shows in name order and the characters inside each in the
	// registry's order, each character's colours in rainbow order — so the same avatar
	// is always in the same place, and a box that deals another colour of a character
	// already held drops it in beside the ones it belongs with rather than at the top.
	// Characters the local registry cannot draw are left out: an avatar with no
	// portrait behind it would be an empty square that still saves.
	const characterIds = characters.map((character) => character.id);
	// The character a tile shows, for its tooltip — the grids no longer say it in
	// lettering, since what they group by now is the show.
	const labels = new Map(characters.map((character) => [character.id, character.label]));

	$: groups = avatarsByShow($avatars, characterIds, characterShows);

	async function pick(avatar: Avatar): Promise<void> {
		if (saving) return;
		errorMessage = null;
		saving = avatar.id;
		try {
			await authService.setAvatar(avatar.characterId, avatar.color);
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

			{#if loading}
				<div class="flex items-center gap-2 py-8 opacity-70">
					<span class="loading loading-spinner loading-sm"></span>
					<span class="text-sm">{$_('common.loading')}</span>
				</div>
			{:else if groups.length === 0}
				<p class="py-8 text-sm opacity-70">{$_('profile.avatar.none')}</p>
			{:else}
				<!-- One grid per show: a collection is read as the shows it covers, so the
					show is what the headings say and every portrait it dealt sits in its grid
					together, whichever character it is of. A grid and not a row because a show
					holds many characters in many colours — columns are what lets the eye run
					down it — and the tiles keep the character's name in their tooltip, which is
					the one place it is still said. -->
				<div class="mt-4 flex flex-col gap-4">
					{#each groups as group (group.show?.id ?? 'unlisted')}
						<div class="flex flex-col gap-1">
							<span class="text-sm font-semibold">
								{group.show?.name ?? $_('profile.avatar.noShow')}
							</span>
							<div class="grid grid-cols-4 gap-3 sm:grid-cols-6 md:grid-cols-8">
								{#each group.avatars as avatar (avatarKey(avatar.characterId, avatar.color))}
									{@const worn = isWornAvatar(
										avatar,
										$profile?.avatarCharacterId ?? null,
										$profile?.avatarColor ?? null
									)}
									<button
										type="button"
										class={classNames('relative rounded-md p-1 transition', {
											'ring-2 ring-primary': worn,
											'hover:ring-2 hover:ring-base-300': !worn
										})}
										title={labels.get(avatar.characterId) ?? avatar.characterId}
										disabled={saving !== null}
										on:click={() => pick(avatar)}
									>
										<PlayerAvatar
											characterId={avatar.characterId}
											color={avatar.color}
											size="w-full"
										/>
										{#if saving === avatar.id}
											<span
												class="absolute inset-0 flex items-center justify-center rounded-md bg-base-100/70"
											>
												<span class="loading loading-spinner loading-sm"></span>
											</span>
										{/if}
									</button>
								{/each}
							</div>
						</div>
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
