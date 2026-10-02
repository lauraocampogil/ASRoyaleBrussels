<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
	let submitting = $state(false);
	let showPassword = $state(false);
</script>

<div
	class="relative flex min-h-screen items-center justify-center bg-dark px-5"
	style="background-image: linear-gradient(rgba(10,10,10,0.75), rgba(10,10,10,0.85)), url('/assets/images/academy-background.jpg'); background-size: cover; background-position: center;"
>
	<form
		method="POST"
		use:enhance={() => {
			submitting = true;
			return async ({ update }) => {
				await update();
				submitting = false;
			};
		}}
		class="w-full max-w-sm rounded-2xl bg-background p-6 sm:p-8"
	>
		<img
			src="/assets/images/logo.svg"
			alt="Brussels Summit Academy"
			class="mx-auto mb-6 h-14 w-auto"
		/>

		<h1 class="font-clash mb-6 text-center text-2xl text-dark">Espace staff</h1>

		{#if form?.error}
			<p class="mb-4 rounded bg-red-100 px-3 py-2 text-sm text-red-700">{form.error}</p>
		{/if}

		<label class="mb-4 block">
			<span class="mb-1 block text-sm text-dark">Email</span>
			<input
				type="email"
				name="email"
				required
				class="w-full rounded border border-dark-accent/30 px-3 py-2 text-dark"
			/>
		</label>

		<label class="mb-6 block">
			<span class="mb-1 block text-sm text-dark">Mot de passe</span>
			<div class="relative">
				<input
					type={showPassword ? 'text' : 'password'}
					name="password"
					required
					class="w-full rounded border border-dark-accent/30 px-3 py-2 pr-10 text-dark"
				/>
				<button
					type="button"
					onclick={() => (showPassword = !showPassword)}
					class="absolute inset-y-0 right-0 flex items-center px-3 text-dark-accent"
					aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
				>
					{#if showPassword}
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="18"
							height="18"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
							><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" /><path
								d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"
							/><path
								d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"
							/><line x1="2" x2="22" y1="2" y2="22" /></svg
						>
					{:else}
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="18"
							height="18"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
							><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle
								cx="12"
								cy="12"
								r="3"
							/></svg
						>
					{/if}
				</button>
			</div>
		</label>

		<button
			type="submit"
			disabled={submitting}
			class="w-full rounded bg-secondary px-6 py-3 text-dark transition-opacity hover:opacity-90 disabled:opacity-50"
		>
			{submitting ? 'Connexion...' : 'Se connecter'}
		</button>
	</form>
</div>
