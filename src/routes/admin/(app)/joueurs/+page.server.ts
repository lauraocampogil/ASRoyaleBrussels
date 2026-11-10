import { PUBLIC_DIRECTUS_URL } from '$env/static/public';
import { env } from '$env/dynamic/private';
import { parseJsonField } from '$lib/server/registrations';
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
	const TWO_WEEKS = 14 * 24 * 3600 * 1000;

	const players = rows
		.map((r) => {
			const dossier = parseJsonField<Record<string, any>>(r.dossier);
			const hasDossier = !!dossier && Object.keys(dossier).length > 0;
			const status: string = r.status ?? 'pending';
			const isTalent = r.type === 'talent_days';

			// « Pas venu » : visible 2 semaines seulement (après l'événement ou l'inscription),
			// puis archivé (il reste dans Talent Day > Historique / Faire un essai).
			const noShow =
				status !== 'accepted' &&
				(r.venue === false || (isTalent && talentDayPassed && status === 'pending' && r.venue !== true));

			let stage: string;
			if (noShow) {
				const ref = Date.parse(isTalent ? talentDayDate : String(r.date_created ?? ''));
				const recent = Number.isNaN(ref) || Date.now() - ref < TWO_WEEKS;
				const superseded = isTalent && essaiEmails.has(String(r.email ?? '').toLowerCase());
				stage = recent && !superseded ? 'absent' : 'archive';
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
