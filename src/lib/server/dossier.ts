// Lecture et validation du formulaire de candidature « Rejoindre l'académie ».

export type Dossier = Record<string, string | boolean | null>;

const text = (data: FormData, key: string) => String(data.get(key) ?? '').trim();
const checked = (data: FormData, key: string) => data.get(key) === 'on';

export function parseDossier(
	data: FormData,
	isMinor: boolean
): { dossier: Dossier; error?: string } {
	const dossier: Dossier = {
		ville: text(data, 'residence_ville'),
		pays: text(data, 'residence_pays'),
		pied: text(data, 'foot'),
		taille: text(data, 'height'),
		club_actuel: text(data, 'current_club'),
		niveau: text(data, 'niveau'),
		annees_pratique: text(data, 'annees_pratique'),
		clubs_precedents: text(data, 'clubs_precedents') || null,
		postes_occupes: text(data, 'postes_occupes') || null,
		qualites: text(data, 'qualites') || null,
		ameliorer: text(data, 'ameliorer') || null,
		selection_nationale: text(data, 'selection_nationale') || null,
		selection_annee: text(data, 'selection_annee') || null,
		selection_categorie: text(data, 'selection_categorie') || null,
		video: text(data, 'video_url') || null,
		pourquoi: text(data, 'motivation_pourquoi'),
		objectif: text(data, 'motivation_objectif'),
		effort: text(data, 'motivation_effort'),
		disponible: text(data, 'disponible'),
		situation: text(data, 'situation'),
		info_contrat: text(data, 'info_contrat'),
		info_contrat_precision: text(data, 'info_contrat_precision') || null,
		urgence_nom: text(data, 'urgence_nom'),
		urgence_tel: text(data, 'urgence_tel'),
		taille_polo: text(data, 'taille_polo'),
		taille_veste: text(data, 'taille_veste'),
		taille_maillot: text(data, 'taille_maillot'),
		taille_chaussettes: text(data, 'taille_chaussettes'),
		droit_image: checked(data, 'confirm_images'),
		mineur: isMinor,
		parent_nom: isMinor ? text(data, 'parent_nom') : null,
		parent_email: isMinor ? text(data, 'parent_email') : null,
		parent_tel: isMinor ? text(data, 'parent_tel') : null,
		parent_autorisation: isMinor ? checked(data, 'parent_autorisation') : null,
		soumis_le: new Date().toISOString()
	};

	const required = [
		'ville',
		'pays',
		'pied',
		'taille',
		'club_actuel',
		'niveau',
		'annees_pratique',
		'pourquoi',
		'objectif',
		'effort',
		'disponible',
		'situation',
		'info_contrat',
		'urgence_nom',
		'urgence_tel',
		'taille_polo',
		'taille_veste',
		'taille_maillot',
		'taille_chaussettes'
	];
	if (required.some((k) => !dossier[k])) {
		return { dossier, error: 'Merci de remplir tous les champs obligatoires.' };
	}

	if (dossier.info_contrat === 'oui' && !dossier.info_contrat_precision) {
		return { dossier, error: "Précise l'information nécessaire à connaître pour ton inscription." };
	}

	const confirmations = [
		'confirm_exact',
		'confirm_evaluation',
		'confirm_cadre',
		'confirm_contact',
		'confirm_reglement'
	];
	if (!confirmations.every((k) => checked(data, k))) {
		return { dossier, error: 'Merci de cocher toutes les confirmations en bas du formulaire.' };
	}

	if (isMinor) {
		if (!dossier.parent_nom || !dossier.parent_email || !dossier.parent_tel) {
			return {
				dossier,
				error: "Pour les mineur·es, le nom, l'email et le téléphone du parent sont obligatoires."
			};
		}
		if (!dossier.parent_autorisation) {
			return { dossier, error: "L'autorisation du parent ou responsable légal est requise." };
		}
	}

	return { dossier };
}
