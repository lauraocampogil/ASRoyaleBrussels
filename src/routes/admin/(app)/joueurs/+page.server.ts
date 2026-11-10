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
	try {
		const textRes = await fetch(`${PUBLIC_DIRECTUS_URL}/items/RegistrationText`, {
			headers: { Authorization: `Bearer ${env.DIRECTUS_SERVICE_TOKEN}` }
		});
		if (textRes.ok) {
			const settings = (await textRes.json()).data;
			if (settings?.talent_day_date) {
				const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Brussels' });
				talentDayPassed =
					String(settings.talent_day_date).slice(0, 10) < today || !settings.talent_day_active;
			}
		}
	} catch (err) {
		console.error('Joueurs: RegistrationText fetch failed:', err);
	}
	const players = rows.map((r) => {
		const dossier = parseJsonField<Record<string, any>>(r.dossier);
		const hasDossier = !!dossier && Object.keys(dossier).length > 0;
		const status: string = r.status ?? 'pending';
		// Étape du pipeline
		// Talent Day : les personnes qui ne sont pas venues sont à part (sauf si elles ont été acceptées).
		const absent =
			status !== 'accepted' &&
			(r.venue === false ||
				(r.type === 'talent_days' && talentDayPassed && status === 'pending' && r.venue !== true));
		const stage = absent
			? 'absent'
			: status === 'accepted'
				? hasDossier
					? 'complete'
					: 'accepted'
				: status === 'rejected'
					? 'rejected'
					: 'pending';
		return {
			...r,
			status,
			stage,
			hasDossier,
			dossier: dossier ?? {},
			paiements: parseJsonField(r.paiements) ?? [],
			presences: parseJsonField(r.presences) ?? {}
		};
	});

	return { players, loadError: false };
};
