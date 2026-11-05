<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components';
	import { toLightJpeg, MIN_DIMENSION } from '$lib/imageUpload';
	import { CLOTHING_SIZES, SOCK_SIZES } from '$lib/dossier';

	let {
		form
	}: {
		form: { error?: string; values?: Record<string, any> } | null | undefined;
	} = $props();

	let converting = $state(false);
	let idFrontPreview = $state<string | null>(null);
	let idBackPreview = $state<string | null>(null);
	let idFrontError = $state('');
	let idBackError = $state('');
	let photoPreview = $state<string | null>(null);
	let photoError = $state('');

	async function handlePhotoChange(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		const original = input.files?.[0];
		if (!original) return;
		photoError = '';

		converting = true;
		const file = await toLightJpeg(original);
		if (file !== original) {
			const dt = new DataTransfer();
			dt.items.add(file);
			input.files = dt.files;
		}
		converting = false;

		if (!file.type.startsWith('image/') || /heic|heif/i.test(file.type) || /\.(heic|heif)$/i.test(file.name)) {
			input.value = '';
			photoPreview = null;
			photoError = 'Cette photo ne peut pas être lue. Envoie-la en JPG ou PNG (ou fais une capture d\'écran).';
			return;
		}
		photoPreview = URL.createObjectURL(file);
	}

	async function handleIdCardChange(e: Event, side: 'front' | 'back') {
		const input = e.currentTarget as HTMLInputElement;
		const original = input.files?.[0];
		if (!original) return;

		converting = true;
		const file = await toLightJpeg(original);
		if (file !== original) {
			const dt = new DataTransfer();
			dt.items.add(file);
			input.files = dt.files;
		}
		converting = false;

		const setError0 = (v: string) => (side === 'front' ? (idFrontError = v) : (idBackError = v));
		if (/heic|heif/i.test(file.type) || /\.(heic|heif)$/i.test(file.name)) {
			input.value = '';
			setError0(
				"Cette photo (format HEIC) ne peut pas être lue. Fais une capture d'écran de ta carte ou envoie-la en JPG/PNG."
			);
			return;
		}

		const setPreview = (v: string | null) =>
			side === 'front' ? (idFrontPreview = v) : (idBackPreview = v);
		const setError = (v: string) => (side === 'front' ? (idFrontError = v) : (idBackError = v));
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

	let v = $derived((form?.values ?? {}) as Record<string, any>);
	let submitting = $state(false);
	let birthDate = $state('');
	let infoContrat = $state('non');
	let selection = $state('non');

	let isMinor = $derived.by(() => {
		if (!birthDate) return false;
		const b = new Date(birthDate);
		if (isNaN(b.getTime())) return false;
		const t = new Date();
		let age = t.getFullYear() - b.getFullYear();
		if (t.getMonth() < b.getMonth() || (t.getMonth() === b.getMonth() && t.getDate() < b.getDate()))
			age--;
		return age < 18;
	});
</script>

<form
	method="POST"
	enctype="multipart/form-data"
	use:enhance={({ cancel }) => {
		if (submitting) {
			cancel();
			return;
		}
		submitting = true;
		return async ({ update }) => {
			submitting = false;
			await update();
		};
	}}
	class="flex flex-col gap-6"
>
	<input type="hidden" name="type" value="academie" />
	<input type="hidden" name="dossier_form" value="1" />

	<p class="rounded-lg bg-primary/5 px-4 py-3 text-sm text-dark">
		Les champs marqués d'un * sont obligatoires. Après étude du dossier, l'Academy contactera les
		profils retenus pour la suite du processus.
	</p>

	<h2 class="font-clash text-title-md text-primary">Identité</h2>
	<div class="mb-2">
		<span class="mb-2 block text-dark/70">Genre *</span>
		<div class="flex gap-4">
			<label class="flex items-center gap-2 text-dark">
				<input type="radio" name="gender" value="fille" required checked={v.gender === 'fille'} /> Femme
			</label>
			<label class="flex items-center gap-2 text-dark">
				<input type="radio" name="gender" value="garcon" required checked={v.gender === 'garcon'} /> Homme
			</label>
		</div>
	</div>
	<div class="grid grid-cols-1 gap-y-5 sm:grid-cols-2 sm:gap-x-6 sm:gap-y-6">
		<label class="flex flex-col gap-2">
			<span class="text-dark/70">Prénom *</span>
			<input type="text" name="first_name" required value={v.first_name ?? ''} class="rounded-md border border-dark/30 px-4 py-3 focus:border-primary focus:outline-none" />
		</label>
		<label class="flex flex-col gap-2">
			<span class="text-dark/70">Nom *</span>
			<input type="text" name="last_name" required value={v.last_name ?? ''} class="rounded-md border border-dark/30 px-4 py-3 focus:border-primary focus:outline-none" />
		</label>
		<label class="flex flex-col gap-2">
			<span class="text-dark/70">Date de naissance *</span>
			<input type="date" name="birth_date" required bind:value={birthDate} class="rounded-md border border-dark/30 px-4 py-3 focus:border-primary focus:outline-none" />
			<span class="text-xs text-dark-accent">Inscriptions ouvertes de 16 à 28 ans</span>
		</label>
		<label class="flex flex-col gap-2">
			<span class="text-dark/70">Ville de résidence *</span>
			<input type="text" name="residence_ville" required value={v.residence_ville ?? ''} class="rounded-md border border-dark/30 px-4 py-3 focus:border-primary focus:outline-none" />
		</label>
		<label class="flex flex-col gap-2">
			<span class="text-dark/70">Pays de résidence *</span>
			<input type="text" name="residence_pays" required value={v.residence_pays ?? ''} class="rounded-md border border-dark/30 px-4 py-3 focus:border-primary focus:outline-none" />
		</label>
		<label class="flex flex-col gap-2">
			<span class="text-dark/70">Téléphone *</span>
			<input type="tel" name="phone" required value={v.phone ?? ''} class="rounded-md border border-dark/30 px-4 py-3 focus:border-primary focus:outline-none" />
		</label>
		<label class="flex flex-col gap-2">
			<span class="text-dark/70">Adresse e-mail *</span>
			<input type="email" name="email" required value={v.email ?? ''} class="rounded-md border border-dark/30 px-4 py-3 focus:border-primary focus:outline-none" />
		</label>
		<label class="flex flex-col gap-2">
			<span class="text-dark/70">Confirme ton email *</span>
			<input type="email" name="email_confirm" required autocomplete="off" onpaste={(e) => e.preventDefault()} class="rounded-md border border-dark/30 px-4 py-3 focus:border-primary focus:outline-none" />
			<span class="text-xs text-dark-accent">Écris-le à nouveau pour éviter une faute de frappe</span>
		</label>
		<label class="flex flex-col gap-2">
			<span class="text-dark/70">Compte Instagram *</span>
			<input type="text" name="instagram" required value={v.instagram ?? ''} placeholder="@ton_compte" class="rounded-md border border-dark/30 px-4 py-3 focus:border-primary focus:outline-none" />
			<span class="text-xs text-dark-accent">Pour te contacter si ton email ne fonctionne pas</span>
		</label>
	</div>

	<div>
		<label class="mb-1 block text-dark/70" for="id_card_front">Carte d'identité — Recto *</label>
		<input type="file" id="id_card_front" name="id_card_front" accept="image/*,.pdf,.heic,.heif" required onchange={(e) => handleIdCardChange(e, 'front')} class="w-full rounded-md border border-dark/30 px-4 py-3 text-dark focus:border-primary focus:outline-none" />
		<p class="mt-1 text-xs text-dark-accent">
			Photo ou scan net et lisible, obligatoire (même si tu nous l'as déjà envoyée).
		</p>
		{#if idFrontPreview}
			<img src={idFrontPreview} alt="Aperçu recto" class="mt-2 h-32 w-auto rounded border border-dark-accent/20 object-contain" />
		{/if}
		{#if idFrontError}<p class="mt-1 text-xs text-red-600">{idFrontError}</p>{/if}
	</div>
	<div>
		<label class="mb-1 block text-dark/70" for="id_card_back">Carte d'identité — Verso *</label>
		<input type="file" id="id_card_back" name="id_card_back" accept="image/*,.pdf,.heic,.heif" required onchange={(e) => handleIdCardChange(e, 'back')} class="w-full rounded-md border border-dark/30 px-4 py-3 text-dark focus:border-primary focus:outline-none" />
		{#if idBackPreview}
			<img src={idBackPreview} alt="Aperçu verso" class="mt-2 h-32 w-auto rounded border border-dark-accent/20 object-contain" />
		{/if}
		{#if idBackError}<p class="mt-1 text-xs text-red-600">{idBackError}</p>{/if}
	</div>

	<h2 class="font-clash mt-4 text-title-md text-primary">Profil sportif</h2>
	<div class="grid grid-cols-1 gap-y-5 sm:grid-cols-2 sm:gap-x-6 sm:gap-y-6">
		<label class="flex flex-col gap-2">
			<span class="text-dark/70">Poste principal *</span>
			<select name="preferred_position" required value={v.preferred_position ?? ''} class="rounded-md border border-dark/30 bg-background px-4 py-3 focus:border-primary focus:outline-none">
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
		<div class="flex flex-col gap-2">
			<span class="text-dark/70">Pied préféré *</span>
			<div class="flex flex-wrap gap-4 py-3">
				<label class="flex items-center gap-2 text-dark"><input type="radio" name="foot" value="droit" required checked={v.foot === 'droit'} /> Droit</label>
				<label class="flex items-center gap-2 text-dark"><input type="radio" name="foot" value="gauche" required checked={v.foot === 'gauche'} /> Gauche</label>
				<label class="flex items-center gap-2 text-dark"><input type="radio" name="foot" value="les_deux" required checked={v.foot === 'les_deux'} /> Les deux</label>
			</div>
		</div>
		<label class="flex flex-col gap-2">
			<span class="text-dark/70">Taille (cm) *</span>
			<input type="number" name="height" required value={v.height ?? ''} min="120" max="230" class="rounded-md border border-dark/30 px-4 py-3 focus:border-primary focus:outline-none" />
		</label>
		<label class="flex flex-col gap-2">
			<span class="text-dark/70">Club actuel *</span>
			<input type="text" name="current_club" required value={v.current_club ?? ''} class="rounded-md border border-dark/30 px-4 py-3 focus:border-primary focus:outline-none" />
			<span class="text-xs text-dark-accent">Écris « Aucun » si tu n'as pas de club</span>
		</label>
		<label class="flex flex-col gap-2">
			<span class="text-dark/70">Niveau, division ou championnat disputé *</span>
			<input type="text" name="niveau" required value={v.niveau ?? ''} class="rounded-md border border-dark/30 px-4 py-3 focus:border-primary focus:outline-none" />
		</label>
		<label class="flex flex-col gap-2">
			<span class="text-dark/70">Années de pratique du football *</span>
			<input type="text" name="annees_pratique" required value={v.annees_pratique ?? ''} class="rounded-md border border-dark/30 px-4 py-3 focus:border-primary focus:outline-none" />
		</label>
		<label class="flex flex-col gap-2 sm:col-span-2">
			<span class="text-dark/70">Clubs précédents</span>
			<textarea name="clubs_precedents" rows="3" class="rounded-md border border-dark/30 px-4 py-3 focus:border-primary focus:outline-none">{v.clubs_precedents ?? ''}</textarea>
		</label>
		<label class="flex flex-col gap-2 sm:col-span-2">
			<span class="text-dark/70">Poste(s) déjà occupé(s)</span>
			<textarea name="postes_occupes" rows="3" class="rounded-md border border-dark/30 px-4 py-3 focus:border-primary focus:outline-none">{v.postes_occupes ?? ''}</textarea>
		</label>
		<label class="flex flex-col gap-2 sm:col-span-2">
			<span class="text-dark/70">Principales qualités sur le terrain</span>
			<textarea name="qualites" rows="3" class="rounded-md border border-dark/30 px-4 py-3 focus:border-primary focus:outline-none">{v.qualites ?? ''}</textarea>
		</label>
		<label class="flex flex-col gap-2 sm:col-span-2">
			<span class="text-dark/70">Points que tu souhaites améliorer</span>
			<textarea name="ameliorer" rows="3" class="rounded-md border border-dark/30 px-4 py-3 focus:border-primary focus:outline-none">{v.ameliorer ?? ''}</textarea>
		</label>
		<label class="flex flex-col gap-2">
			<span class="text-dark/70">Sélection nationale</span>
			<select name="selection_nationale" bind:value={selection} class="rounded-md border border-dark/30 bg-background px-4 py-3 focus:border-primary focus:outline-none">
				<option value="non">Non</option>
				<option value="oui">Oui</option>
			</select>
		</label>
		{#if selection === 'oui'}
		<label class="flex flex-col gap-2">
			<span class="text-dark/70">Année</span>
			<input type="text" name="selection_annee" value={v.selection_annee ?? ''} class="rounded-md border border-dark/30 px-4 py-3 focus:border-primary focus:outline-none" />
		</label>
		<label class="flex flex-col gap-2">
			<span class="text-dark/70">Catégorie (U15, U17, A...)</span>
			<input type="text" name="selection_categorie" value={v.selection_categorie ?? ''} class="rounded-md border border-dark/30 px-4 py-3 focus:border-primary focus:outline-none" />
		</label>
		{/if}
		<div class="sm:col-span-2">
			<label class="mb-1 block text-dark/70" for="photo_club">Photo de toi avec le maillot de ton club actuel *</label>
			<input
				type="file"
				id="photo_club"
				name="photo_club"
				accept="image/*,.heic,.heif"
				required
				onchange={handlePhotoChange}
				class="w-full rounded-md border border-dark/30 px-4 py-3 text-dark focus:border-primary focus:outline-none"
			/>
			<p class="mt-1 text-xs text-dark-accent">
				Une photo où l'on te voit bien, avec la tenue de ton club. Si tu n'as pas de club, envoie une photo de toi en tenue de sport.
			</p>
			{#if photoPreview}
				<img src={photoPreview} alt="Aperçu de ta photo" class="mt-2 h-40 w-auto rounded border border-dark-accent/20 object-contain" />
			{/if}
			{#if photoError}<p class="mt-1 text-xs text-red-600">{photoError}</p>{/if}
		</div>
		<label class="flex flex-col gap-2 sm:col-span-2">
			<span class="text-dark/70">Lien vers une vidéo de match ou de présentation (facultatif)</span>
			<input type="url" name="video_url" value={v.video_url ?? ''} placeholder="https://" class="rounded-md border border-dark/30 px-4 py-3 focus:border-primary focus:outline-none" />
		</label>
	</div>

	<h2 class="font-clash mt-4 text-title-md text-primary">Projet et motivation</h2>
	<div class="grid grid-cols-1 gap-y-5 sm:grid-cols-2 sm:gap-x-6 sm:gap-y-6">
		<label class="flex flex-col gap-2 sm:col-span-2">
			<span class="text-dark/70">Pourquoi souhaites-tu rejoindre BSA ? *</span>
			<textarea name="motivation_pourquoi" rows="3" required class="rounded-md border border-dark/30 px-4 py-3 focus:border-primary focus:outline-none">{v.motivation_pourquoi ?? ''}</textarea>
		</label>
		<label class="flex flex-col gap-2 sm:col-span-2">
			<span class="text-dark/70">Quel est ton objectif sportif ? *</span>
			<textarea name="motivation_objectif" rows="3" required class="rounded-md border border-dark/30 px-4 py-3 focus:border-primary focus:outline-none">{v.motivation_objectif ?? ''}</textarea>
		</label>
		<label class="flex flex-col gap-2 sm:col-span-2">
			<span class="text-dark/70">Qu'es-tu prêt·e à faire pour progresser ? *</span>
			<textarea name="motivation_effort" rows="3" required class="rounded-md border border-dark/30 px-4 py-3 focus:border-primary focus:outline-none">{v.motivation_effort ?? ''}</textarea>
		</label>
		<div class="flex flex-col gap-2 sm:col-span-2">
			<span class="text-dark/70">Es-tu disponible pour participer à nos activités sportives et culturelles ? *</span>
			<div class="flex gap-4">
				<label class="flex items-center gap-2 text-dark"><input type="radio" name="disponible" value="oui" required checked={v.disponible === 'oui'} /> Oui</label>
				<label class="flex items-center gap-2 text-dark"><input type="radio" name="disponible" value="non" required checked={v.disponible === 'non'} /> Non</label>
			</div>
		</div>
	</div>

	<h2 class="font-clash mt-4 text-title-md text-primary">Situation et inscription</h2>
	<div class="grid grid-cols-1 gap-y-5 sm:grid-cols-2 sm:gap-x-6 sm:gap-y-6">
		<label class="flex flex-col gap-2 sm:col-span-2">
			<span class="text-dark/70">Situation scolaire ou professionnelle *</span>
			<textarea name="situation" rows="3" required class="rounded-md border border-dark/30 px-4 py-3 focus:border-primary focus:outline-none">{v.situation ?? ''}</textarea>
		</label>
		<div class="flex flex-col gap-2 sm:col-span-2">
			<span class="text-dark/70">Existe-t-il une information nécessaire à connaître pour organiser la finalisation de ton inscription et avoir ton contrat d'adhésion ? *</span>
			<div class="flex gap-4">
				<label class="flex items-center gap-2 text-dark"><input type="radio" name="info_contrat" value="non" bind:group={infoContrat} /> Non</label>
				<label class="flex items-center gap-2 text-dark"><input type="radio" name="info_contrat" value="oui" bind:group={infoContrat} /> Oui — précise</label>
			</div>
			{#if infoContrat === 'oui'}
				<textarea name="info_contrat_precision" rows="2" required class="rounded-md border border-dark/30 px-4 py-3 focus:border-primary focus:outline-none"></textarea>
			{/if}
		</div>
		<label class="flex flex-col gap-2">
			<span class="text-dark/70">Contact à joindre en cas d'urgence (nom et lien) *</span>
			<input type="text" name="urgence_nom" required value={v.urgence_nom ?? ''} class="rounded-md border border-dark/30 px-4 py-3 focus:border-primary focus:outline-none" />
		</label>
		<label class="flex flex-col gap-2">
			<span class="text-dark/70">Téléphone du contact d'urgence *</span>
			<input type="tel" name="urgence_tel" required value={v.urgence_tel ?? ''} class="rounded-md border border-dark/30 px-4 py-3 focus:border-primary focus:outline-none" />
		</label>
	</div>

	<h2 class="font-clash mt-4 text-title-md text-primary">Équipement (tailles européennes)</h2>
	<div class="grid grid-cols-1 gap-y-5 sm:grid-cols-2 sm:gap-x-6 sm:gap-y-6">
		{#each [['taille_polo', 'Taille de polo'], ['taille_veste', "Taille de veste d'hiver"], ['taille_maillot', 'Taille de maillot']] as [name, label] (name)}
			<label class="flex flex-col gap-2">
				<span class="text-dark/70">{label} *</span>
				<select
					{name}
					required
					value={v[name] ?? ''}
					class="rounded-md border border-dark/30 bg-background px-4 py-3 focus:border-primary focus:outline-none"
				>
					<option value="" disabled selected>Choisir</option>
					{#each CLOTHING_SIZES as size (size)}
						<option value={size}>{size}</option>
					{/each}
				</select>
			</label>
		{/each}
		<label class="flex flex-col gap-2">
			<span class="text-dark/70">Taille de chaussettes (pointure EU) *</span>
			<select
				name="taille_chaussettes"
				required
				value={v.taille_chaussettes ?? ''}
				class="rounded-md border border-dark/30 bg-background px-4 py-3 focus:border-primary focus:outline-none"
			>
				<option value="" disabled selected>Choisir</option>
				{#each SOCK_SIZES as size (size)}
					<option value={size}>{size}</option>
				{/each}
			</select>
		</label>
	</div>

	{#if isMinor}
		<h2 class="font-clash mt-4 text-title-md text-primary">Pour les mineur·es</h2>
		<p class="text-sm text-dark/70">L'accord d'un parent ou responsable légal est requis.</p>
		<div class="grid grid-cols-1 gap-y-5 sm:grid-cols-2 sm:gap-x-6 sm:gap-y-6">
		<label class="flex flex-col gap-2 sm:col-span-2">
			<span class="text-dark/70">Nom du parent ou responsable légal *</span>
			<input type="text" name="parent_nom" required value={v.parent_nom ?? ''} class="rounded-md border border-dark/30 px-4 py-3 focus:border-primary focus:outline-none" />
		</label>
		<label class="flex flex-col gap-2">
			<span class="text-dark/70">Email du parent *</span>
			<input type="email" name="parent_email" required value={v.parent_email ?? ''} class="rounded-md border border-dark/30 px-4 py-3 focus:border-primary focus:outline-none" />
		</label>
		<label class="flex flex-col gap-2">
			<span class="text-dark/70">Téléphone du parent *</span>
			<input type="tel" name="parent_tel" required value={v.parent_tel ?? ''} class="rounded-md border border-dark/30 px-4 py-3 focus:border-primary focus:outline-none" />
		</label>
			<label class="flex items-start gap-3 text-sm text-dark sm:col-span-2">
				<input type="checkbox" name="parent_autorisation" required class="mt-1" />
				<span>J'autorise le dépôt de cette candidature et la participation de mon enfant à une éventuelle évaluation. *</span>
			</label>
		</div>
	{/if}

	<h2 class="font-clash mt-4 text-title-md text-primary">Confirmations</h2>
	<div class="flex flex-col gap-3">
		<label class="flex items-start gap-3 text-sm text-dark">
			<input type="checkbox" name="confirm_exact" required class="mt-1" />
			<span>Je confirme que les informations fournies sont exactes. *</span>
		</label>
		<label class="flex items-start gap-3 text-sm text-dark">
			<input type="checkbox" name="confirm_evaluation" required class="mt-1" />
			<span>Je comprends que l'Academy étudie chaque candidature et peut proposer une évaluation avant toute admission. *</span>
		</label>
		<label class="flex items-start gap-3 text-sm text-dark">
			<input type="checkbox" name="confirm_cadre" required class="mt-1" />
			<span>Je m'engage à respecter le cadre, les règles et les exigences de travail de l'Academy. *</span>
		</label>
		<label class="flex items-start gap-3 text-sm text-dark">
			<input type="checkbox" name="confirm_contact" required class="mt-1" />
			<span>J'accepte d'être contacté·e au sujet de ma candidature. *</span>
		</label>
		<label class="flex items-start gap-3 text-sm text-dark">
			<input type="checkbox" name="confirm_reglement" required class="mt-1" />
			<span>J'accepte le règlement et la politique de confidentialité de l'Academy. *</span>
		</label>
		<label class="flex items-start gap-3 text-sm text-dark">
			<input type="checkbox" name="confirm_images" class="mt-1" />
			<span
				>J'autorise Brussels Summit Academy à utiliser mes photos, images et vidéos (ou celles de mon
				enfant, pour les mineur·es) sur son site, ses réseaux sociaux et ses supports de
				communication. (facultatif)</span
			>
		</label>
	</div>

	{#if form?.error}
		<p class="text-sm text-red-600">{form.error}</p>
	{/if}

	<Button
		type="submit"
		disabled={submitting || converting}
		label={converting ? 'Préparation de la photo...' : submitting ? 'Envoi...' : 'Envoyer ma candidature'}
		variant="primary"
	/>
	<p class="text-center text-sm text-dark/60">
		Après étude du dossier, l'Academy contactera les profils retenus pour la suite du processus.
	</p>
</form>
