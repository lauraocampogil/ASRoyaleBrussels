// Données partagées (site + dashboard) pour le dossier de candidature « Rejoindre l'académie »
// et pour le suivi des paiements.

export const FEES = {
	annual: 150,
	monthly: { garcon: 80, fille: 50 }
} as const;

export const MONTH_LABELS = [
	'Janvier',
	'Février',
	'Mars',
	'Avril',
	'Mai',
	'Juin',
	'Juillet',
	'Août',
	'Septembre',
	'Octobre',
	'Novembre',
	'Décembre'
];

// Ordre et libellés d'affichage dans le dashboard.
export const DOSSIER_SECTIONS: { title: string; fields: [string, string][] }[] = [
	{
		title: 'Profil',
		fields: [
			['ville', 'Ville de résidence'],
			['pays', 'Pays de résidence'],
			['pied', 'Pied préféré'],
			['taille', 'Taille (cm)'],
			['club_actuel', 'Club actuel'],
			['niveau', 'Niveau / division'],
			['annees_pratique', 'Années de pratique'],
			['clubs_precedents', 'Clubs précédents'],
			['postes_occupes', 'Poste(s) déjà occupé(s)'],
			['qualites', 'Principales qualités'],
			['ameliorer', 'Points à améliorer'],
			['selection_nationale', 'Sélection nationale'],
			['selection_annee', 'Année de sélection'],
			['selection_categorie', 'Catégorie'],
			['video', 'Vidéo']
		]
	},
	{
		title: 'Projet et motivation',
		fields: [
			['pourquoi', 'Pourquoi rejoindre BSA ?'],
			['objectif', 'Objectif sportif'],
			['effort', 'Prêt(e) à faire pour progresser'],
			['disponible', 'Disponible activités sportives et culturelles']
		]
	},
	{
		title: 'Situation et inscription',
		fields: [
			['situation', 'Situation scolaire / professionnelle'],
			['info_contrat', 'Information utile pour le contrat'],
			['info_contrat_precision', 'Précision'],
			['urgence_nom', "Contact d'urgence"],
			['urgence_tel', "Téléphone d'urgence"]
		]
	},
	{
		title: 'Mineur(e)',
		fields: [
			['parent_nom', 'Parent / responsable légal'],
			['parent_email', 'Email du parent'],
			['parent_tel', 'Téléphone du parent'],
			['parent_autorisation', 'Autorisation parentale']
		]
	}
];
