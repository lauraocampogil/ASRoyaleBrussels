import { PUBLIC_DIRECTUS_URL } from '$env/static/public';
import { env } from '$env/dynamic/private';
import { parseJsonField } from '$lib/server/registrations';
import { autoArchived, isNoShow } from '$lib/archive';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch }) => {
	const res = await fetch(`${PUBLIC_DIRECTUS_URL}/items/Registration?sort=-id&limit=-1`, {
		headers: { Authorization: `Bearer ${env.DIRECTUS_SERVICE_TOKEN}` }
	});

	if (!res.ok) {
		console.error('Joueurs load failed:', res.status);
		return { players: [], loadError: true };
	}

	const rows: Record<string, any>[] = (await res.json()).data ?? [];

	// Talent Day passé ? (les inscrits non marqués « venu » ne sont alors plus à traiter)
	let talentDayPassed = false;
	let talentDayDate = '';
	try {
		const textRes = await fetch(`${PUBLIC_DIRECTUS_URL}/items/RegistrationText`, {
			headers: { Authorization: `Bearer ${env.DIRECTUS_SERVICE_TOKEN}` }
		});
		if (textRes.ok) {
			const settings = (await textRes.json()).data;
			if (settings?.talent_day_date) {
				const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Brussels' });
				talentDayDate = String(settings.talent_day_date).slice(0, 10);
				talentDayPassed = talentDayDate < today || !settings.talent_day_active;
			}
		}
	} catch (err) {
		console.error('Joueurs: RegistrationText fetch failed:', err);
	}
	// Un ancien inscrit du Talent Day qui s'est réinscrit via « Faire un essai » (même email)
	// suit désormais le parcours « Faire un essai ».
	const essaiEmails = new Set(
		rows.filter((r) => r.type !== 'talent_days').map((r) => String(r.email ?? '').toLowerCase())
	);

	const players = rows
		.map((r) => {
			const dossier = parseJsonField<Record<string, any>>(r.dossier);
			const hasDossier = !!dossier && Object.keys(dossier).length > 0;
			const status: string = r.status ?? 'pending';

			// « Pas venu » : visible 7 jours, puis archivé automatiquement (voir $lib/archive.ts).
			const row = { ...r, status };
			const ctx = { talentDayDate, talentDayPassed, essaiEmails };
			let stage: string;
			if (status !== 'accepted' && (r.archived === true || autoArchived(row, ctx))) {
				stage = 'archived';
			} else if (isNoShow(row, talentDayPassed)) {
				stage = 'absent';
			} else if (status === 'accepted') {
				stage = hasDossier ? 'complete' : 'accepted';
			} else {
				stage = status === 'rejected' ? 'rejected' : 'pending';
			}

			return {
				...r,
				status,
				stage,
				hasDossier,
				dossier: dossier ?? {},
				paiements: parseJsonField(r.paiements) ?? [],
				presences: parseJsonField(r.presences) ?? {}
			};
		})
		.filter((p) => p.stage !== 'archive');

	return { players, loadError: false };
};
