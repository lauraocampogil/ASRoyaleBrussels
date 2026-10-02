<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { Button } from '$lib/components';
	import type { ActionData, PageData } from './$types';
	import { Seo } from '$lib/components';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let activeTab = $state<'talent_days' | 'academie'>('academie');

	$effect(() => {
		const typeParam = page.url.searchParams.get('type');
		if (!data.talentDayActive) {
			activeTab = 'academie';
		} else if (typeParam === 'academie' || typeParam === 'talent_days') {
			activeTab = typeParam;
		} else {
			activeTab = 'talent_days';
		}
	});

	let submitting = $state(false);

	let idFrontPreview = $state<string | null>(null);
	let idBackPreview = $state<string | null>(null);
	let idFrontError = $state('');
	let idBackError = $state('');

	const MIN_DIMENSION = 600;

	function handleIdCardChange(e: Event, side: 'front' | 'back') {
		const input = e.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;

		const setPreview =
			side === 'front'
				? (v: string | null) => (idFrontPreview = v)
				: (v: string | null) => (idBackPreview = v);
		const setError =
			side === 'front' ? (v: string) => (idFrontError = v) : (v: string) => (idBackError = v);

		setError('');

		if (!file.type.startsWith('image/')) {
			setPreview(null);
			return;
		}

		const url = URL.createObjectURL(file);
		setPreview(url);

		const img = new Image();
		img.onload = () => {
			if (img.width < MIN_DIMENSION && img.height < MIN_DIMENSION) {
				setError(
					'Cette photo semble trop petite ou de mauvaise qualité — assure-toi que le texte soit bien net et lisible.'
				);
			}
		};
		img.src = url;
	}
</script>

<Seo
	title="Inscription"
	description="Inscris-toi au Talent Day ou rejoins l'académie Brussels Summit Academy."
/>

<section
	class="grid-section sm-grid-section relative flex min-h-screen items-center justify-center bg-background px-5 py-16 sm:px-8 sm:py-20 md:px-10 md:py-24 lg:px-12 3xl:container 3xl:mx-auto"
>
	<div class="absolute top-8 left-5 sm:left-8 md:left-10 lg:left-12">
		<Button href="/" label="← Retour à l'accueil" variant="outline-primary" />
	</div>

	<div
		class="col-span-8 mx-auto mt-16 w-full max-w-2xl rounded-2xl border border-dark/10 bg-background p-5 sm:mt-0 sm:p-6 md:p-8"
	>
		<div class="mb-8 flex flex-col items-center gap-3 text-center">
			{#if data.logo}
				<img src={data.logo} alt="Brussels Summit Academy" class="mb-2 h-20 w-auto" />
			{/if}
			{#if data.eyebrow}
				<p class="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-primary">
					<span class="h-px w-6 bg-primary"></span>
					{data.eyebrow}
					<span class="h-px w-6 bg-primary"></span>
				</p>
			{/if}
			{#if data.title}
				<h1 class="font-clash text-mobile-title-xl uppercase text-dark md:text-title-xl">
					{data.title}
				</h1>
			{/if}
		</div>

		{#if data.talentDayActive}
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

			{#if activeTab === 'talent_days' && data.talentDayDate}
				<p class="-mt-6 mb-8 text-center text-sm text-dark/60">
					Prochaine session : <span class="font-semibold text-primary">{data.talentDayDate}</span>
				</p>
			{/if}
		{/if}

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

				<div class="mb-4">
					<span class="mb-2 block text-dark/70">Genre</span>
					<div class="flex gap-4">
						<label class="flex items-center gap-2 text-dark">
							<input type="radio" name="gender" value="fille" required /> Femme
						</label>
						<label class="flex items-center gap-2 text-dark">
							<input type="radio" name="gender" value="garcon" required /> Homme
						</label>
					</div>
				</div>

				<div class="grid grid-cols-1 gap-y-5 sm:grid-cols-2 sm:gap-x-6 sm:gap-y-6">
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
					{#if activeTab === 'academie'}
						<label class="flex flex-col gap-2">
							<span class="text-dark/70">Lieu de naissance</span>
							<input
								name="birth_place"
								required
								value={form?.values?.birth_place ?? ''}
								class="rounded-md border border-dark/30 px-4 py-3 focus:border-primary focus:outline-none"
							/>
						</label>
						<label class="flex flex-col gap-2">
							<span class="text-dark/70">Nationalité</span>
							<input
								name="nationality"
								required
								value={form?.values?.nationality ?? ''}
								class="rounded-md border border-dark/30 px-4 py-3 focus:border-primary focus:outline-none"
							/>
						</label>

						<label class="flex flex-col gap-2 sm:col-span-2">
							<span class="text-dark/70">Adresse postale</span>
							<input
								name="address"
								required
								value={form?.values?.address ?? ''}
								class="rounded-md border border-dark/30 px-4 py-3 focus:border-primary focus:outline-none"
							/>
						</label>
						<label class="flex flex-col gap-2">
							<span class="text-dark/70">Code postal</span>
							<input
								name="postal_code"
								required
								value={form?.values?.postal_code ?? ''}
								class="rounded-md border border-dark/30 px-4 py-3 focus:border-primary focus:outline-none"
							/>
						</label>

						<div class="mb-4">
							<label class="mb-1 block text-dark/70" for="current_club">Club actuel</label>
							<input
								id="current_club"
								name="current_club"
								type="text"
								class="w-full rounded-md border border-dark/30 px-4 py-3 text-dark focus:border-primary focus:outline-none"
							/>
						</div>

						<div class="mb-4">
							<label class="mb-1 block text-dark/70" for="division">Division</label>
							<select
								id="division"
								name="division"
								class="w-full rounded-md border border-dark/30 px-4 py-3 text-dark focus:border-primary focus:outline-none"
							>
								<option value="">Sélectionne ta division</option>
								<option value="nationale_1">Nationale 1</option>
								<option value="nationale_2">Nationale 2</option>
								<option value="nationale_3">Nationale 3</option>
								<option value="provinciale_1">Provinciale 1</option>
								<option value="provinciale_2">Provinciale 2</option>
								<option value="provinciale_3">Provinciale 3</option>
								<option value="provinciale_4">Provinciale 4</option>
								<option value="regionale">Régionale</option>
								<option value="u23">U23</option>
								<option value="u18_elite">U18 Elite</option>
								<option value="autre">Autre</option>
							</select>
						</div>
					{/if}
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
				</div>

				<div class="mb-4">
					<label class="mb-1 block text-dark/70" for="id_card_front">Carte d'identité — Recto</label
					>
					<input
						type="file"
						id="id_card_front"
						name="id_card_front"
						accept="image/*,.pdf"
						required
						onchange={(e) => handleIdCardChange(e, 'front')}
						class="w-full rounded-md border border-dark/30 px-4 py-3 text-dark focus:border-primary focus:outline-none"
					/>
					<p class="mt-1 text-xs text-dark-accent">
						Photo ou scan net et lisible, obligatoire pour ton inscription.
					</p>
					{#if idFrontPreview}
						<img
							src={idFrontPreview}
							alt="Aperçu recto"
							class="mt-2 h-32 w-auto rounded border border-dark-accent/20 object-contain"
						/>
					{/if}
					{#if idFrontError}
						<p class="mt-1 text-xs text-red-600">{idFrontError}</p>
					{/if}
				</div>

				<div class="mb-6">
					<label class="mb-1 block text-dark/70" for="id_card_back">Carte d'identité — Verso</label>
					<input
						type="file"
						id="id_card_back"
						name="id_card_back"
						accept="image/*,.pdf"
						required
						onchange={(e) => handleIdCardChange(e, 'back')}
						class="w-full rounded-md border border-dark/30 px-4 py-3 text-dark focus:border-primary focus:outline-none"
					/>
					{#if idBackPreview}
						<img
							src={idBackPreview}
							alt="Aperçu verso"
							class="mt-2 h-32 w-auto rounded border border-dark-accent/20 object-contain"
						/>
					{/if}
					{#if idBackError}
						<p class="mt-1 text-xs text-red-600">{idBackError}</p>
					{/if}
				</div>

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
