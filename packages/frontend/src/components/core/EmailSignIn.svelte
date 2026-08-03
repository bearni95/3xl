<script lang="ts">
	import classNames from 'classnames';
	import { createEventDispatcher } from 'svelte';
	import { _ } from 'svelte-i18n';
	import { MIN_PASSWORD_LENGTH } from '$types/profile.type';

	// An address and a password: the way in for anybody who does not want a third party
	// standing between them and the game, beside the one for anybody who does (see
	// SocialSignIn). Both are on the same sheet under the same gate, and neither is the
	// main one — an account is an account however it was opened, and Supabase links the
	// two onto one user when the address is the same and verified.
	//
	// One form with two modes rather than two forms. The fields are the same pair either
	// way, and a visitor who does not know which of the two they are — which is most of
	// them, the first time — would otherwise have to guess before they can type anything.
	// The mode is what the submit button says and what the submit *means*; the tabs above
	// are there to be read, not to be found.
	//
	// The password rule is said where it applies and only there: creating an account
	// states the minimum up front, signing in says nothing about length, because an
	// account made under an older rule is not a reason to lock its owner out.
	//
	// No business logic here: this dispatches what was typed, the modal is what signs
	// anybody in.

	/** Which action's request is in flight, or `null` when idle. */
	export let pending: 'signin' | 'signup' | null = null;
	export let disabled: boolean = false;
	export let classes: string = '';

	const dispatch = createEventDispatcher<{
		signin: { email: string; password: string };
		signup: { email: string; password: string };
	}>();

	let mode: 'signin' | 'signup' = 'signin';
	let email = '';
	let password = '';

	$: busy = disabled || pending !== null;
	// The address has to look like one and the password has to be long enough to be worth
	// sending — on a sign-up. On a sign-in, anything typed is worth trying.
	$: ready =
		email.trim().length > 0 &&
		password.length > 0 &&
		(mode === 'signin' || password.length >= MIN_PASSWORD_LENGTH);

	function submit(): void {
		if (busy || !ready) return;
		dispatch(mode, { email: email.trim(), password });
	}

	function pick(next: 'signin' | 'signup'): void {
		if (busy) return;
		mode = next;
	}
</script>

<form class={classNames('flex flex-col gap-3', classes)} on:submit|preventDefault={submit}>
	<!-- Which of the two this form is. `tabs-boxed` carries the look; the panel below is
		the same one either way, so there is nothing for a tab to control but the wording. -->
	<div role="tablist" class="tabs-boxed tabs">
		<button
			type="button"
			role="tab"
			aria-selected={mode === 'signin'}
			disabled={busy}
			class={classNames('tab flex-1', { 'tab-active': mode === 'signin' })}
			on:click={() => pick('signin')}
		>
			{$_('profile.password.haveAccount')}
		</button>
		<button
			type="button"
			role="tab"
			aria-selected={mode === 'signup'}
			disabled={busy}
			class={classNames('tab flex-1', { 'tab-active': mode === 'signup' })}
			on:click={() => pick('signup')}
		>
			{$_('profile.password.newAccount')}
		</button>
	</div>

	<label class="form-control w-full">
		<span class="label-text mb-1">{$_('profile.password.email')}</span>
		<input
			type="email"
			bind:value={email}
			disabled={busy}
			required
			autocomplete="email"
			placeholder={$_('profile.password.emailPlaceholder')}
			class="input input-bordered w-full"
		/>
	</label>

	<label class="form-control w-full">
		<span class="label-text mb-1">{$_('profile.password.password')}</span>
		<input
			type="password"
			bind:value={password}
			disabled={busy}
			required
			minlength={mode === 'signup' ? MIN_PASSWORD_LENGTH : undefined}
			autocomplete={mode === 'signup' ? 'new-password' : 'current-password'}
			class="input input-bordered w-full"
		/>
		{#if mode === 'signup'}
			<span class="mt-1 text-xs text-base-content/50">
				{$_('profile.password.minimum', { values: { length: MIN_PASSWORD_LENGTH } })}
			</span>
		{/if}
	</label>

	<button
		type="submit"
		disabled={busy || !ready}
		class={classNames('btn btn-primary w-full', { 'btn-disabled': busy || !ready })}
	>
		{#if pending}
			<span class="loading loading-spinner loading-sm"></span>
		{/if}
		{mode === 'signup' ? $_('profile.password.createAccount') : $_('profile.password.signIn')}
	</button>
</form>
