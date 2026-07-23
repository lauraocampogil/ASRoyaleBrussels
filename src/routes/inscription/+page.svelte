<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let activeTab = $state<'talent_days' | 'academie'>('talent_days');
	let submitting = $state(false);
</script>

<section
	class="grid-section sm-grid-section relative flex min-h-screen items-center justify-center bg-background px-5 py-24 sm:px-8 md:px-10 lg:px-12 3xl:container 3xl:mx-auto"
>
	<div class="absolute top-8 left-5 sm:left-8 md:left-10 lg:left-12">
		<Button href="/" label="← Retour à l'accueil" variant="outline-primary" />
	</div>

	<div
		class="col-span-8 mx-auto w-full max-w-2xl rounded-2xl border border-dark/10 bg-background p-8"
	>
		<div class="mb-8 flex flex-col items-center gap-3 text-center">
			{#if data.eyebrow}
				<p class="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-primary">
					<span class="h-px w-6 bg-primary"></span>
					{data.eyebrow}
					<span class="h-px w-6 bg-primary"></span>
				</p>
			{/if}
			{#if data.title}
				<h1 class="font-clash text-title-xl uppercase text-dark">{data.title}</h1>
			{/if}
		</div>

		<div class="mb-10 flex overflow-hidden rounded border border-dark">
			<button
				type="button"
				onclick={() => (activeTab = 'talent_days')}
				class="flex-1 py-3 text-button uppercase transition-colors {activeTab === 'talent_days'
					? 'bg-primary text-white'
					: 'bg-background text-dark'}"
			>
				Talent Days
			</button>
			<button
				type="button"
				onclick={() => (activeTab = 'academie')}
				class="flex-1 py-3 text-button uppercase transition-colors {activeTab === 'academie'
					? 'bg-primary text-white'
					: 'bg-background text-dark'}"
			>
				Rejoindre l'académie
			</button>
		</div>

		{#if form?.success}
			<div class="rounded border border-primary bg-primary/5 p-6 text-center">
				<p class="font-clash text-title-md text-primary">Demande envoyée !</p>
				<p class="mt-2 text-dark/70">On te recontacte très vite.</p>
			</div>
		{:else}
			<form
				method="POST"
				enctype="multipart/form-data"
				use:enhance={() => {
					submitting = true;
					return async ({ update }) => {
						submitting = false;
						await update();
					};
				}}
				class="flex flex-col gap-6"
			>
				<input type="hidden" name="type" value={activeTab} />

				<div class="grid grid-cols-2 gap-x-6 gap-y-6">
					<label class="flex flex-col gap-2">
						<span class="text-dark/70">Prénom</span>
						<input
							name="first_name"
							required
							value={form?.values?.first_name ?? ''}
							class="rounded-md border border-dark/30 px-4 py-3 focus:border-primary focus:outline-none"
						/>
					</label>
					<label class="flex flex-col gap-2">
						<span class="text-dark/70">Nom</span>
						<input
							name="last_name"
							required
							value={form?.values?.last_name ?? ''}
							class="rounded-md border border-dark/30 px-4 py-3 focus:border-primary focus:outline-none"
						/>
					</label>

					<label class="flex flex-col gap-2">
						<span class="text-dark/70">Date de naissance</span>
						<input
							type="date"
							name="birth_date"
							required
							value={form?.values?.birth_date ?? ''}
							class="rounded-md border border-dark/30 px-4 py-3 focus:border-primary focus:outline-none"
						/>
					</label>
					<label class="flex flex-col gap-2">
						<span class="text-dark/70">Poste préféré</span>
						<select
							name="preferred_position"
							required
							value={form?.values?.preferred_position ?? ''}
							class="rounded-md border border-dark/30 bg-background px-4 py-3 focus:border-primary focus:outline-none"
						>
							<option value="" disabled selected>Choisir un poste</option>
							<optgroup label="Gardien">
								<option value="GK">Gardien de but</option>
							</optgroup>
							<optgroup label="Défenseurs">
								<option value="CB">Défenseur central</option>
								<option value="LB_RB">Latéral (Droit/Gauche)</option>
								<option value="LWB_RWB">Piston (Droit/Gauche)</option>
								<option value="SW">Libéro</option>
							</optgroup>
							<optgroup label="Milieux">
								<option value="CDM">Milieu défensif</option>
								<option value="CM">Milieu central</option>
								<option value="CAM">Milieu offensif</option>
								<option value="LM_RM">Milieu latéral (Droit/Gauche)</option>
							</optgroup>
							<optgroup label="Attaquants">
								<option value="ST">Buteur / Avant-centre</option>
								<option value="LW_RW">Ailier (Droit/Gauche)</option>
								<option value="CF">Second attaquant</option>
								<option value="F9">Faux numéro 9</option>
							</optgroup>
						</select>
					</label>

					<label class="flex flex-col gap-2">
						<span class="text-dark/70">Email</span>
						<input
							type="email"
							name="email"
							required
							value={form?.values?.email ?? ''}
							class="rounded-md border border-dark/30 px-4 py-3 focus:border-primary focus:outline-none"
						/>
					</label>
					<label class="flex flex-col gap-2">
						<span class="text-dark/70">Téléphone</span>
						<input
							type="tel"
							name="phone"
							required
							value={form?.values?.phone ?? ''}
							class="rounded-md border border-dark/30 px-4 py-3 focus:border-primary focus:outline-none"
						/>
					</label>
				</div>

				<label class="flex flex-col gap-2">
					<span class="text-dark/70">Vidéo highlight (optionnel)</span>
					<input
						type="file"
						name="highlight_video"
						accept="video/*"
						class="rounded-md border border-dark/30 px-4 py-3 file:mr-4 file:rounded file:border-0 file:bg-primary file:px-4 file:py-2 file:text-white"
					/>
				</label>

				<label class="flex flex-col gap-2">
					<span class="text-dark/70">Message (optionnel)</span>
					<textarea
						name="message"
						rows="4"
						value={form?.values?.message ?? ''}
						class="rounded-md border border-dark/30 px-4 py-3 focus:border-primary focus:outline-none"
					></textarea>
				</label>

				{#if form?.error}
					<p class="text-sm text-red-600">{form.error}</p>
				{/if}

				<Button
					type="submit"
					disabled={submitting}
					label={submitting ? 'Envoi...' : 'Envoyer ma demande'}
					variant="primary"
				/>
			</form>
		{/if}
	</div>
</section>
