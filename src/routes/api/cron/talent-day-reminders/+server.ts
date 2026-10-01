import { json } from '@sveltejs/kit';
import { PUBLIC_DIRECTUS_URL } from '$env/static/public';
import { env } from '$env/dynamic/private';
import { sendTalentDayReminderEmail } from '$lib/server/email';
import type { RequestHandler } from './$types';

function getAuthHeaders() {
	return { Authorization: `Bearer ${env.DIRECTUS_SERVICE_TOKEN}` };
}

export const POST: RequestHandler = async ({ request, fetch }) => {
	if (request.headers.get('x-cron-secret') !== env.CRON_SECRET) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const textRes = await fetch(`${PUBLIC_DIRECTUS_URL}/items/RegistrationText`, {
		headers: getAuthHeaders()
	});

	if (!textRes.ok) {
		const errorBody = await textRes.json().catch(() => null);
		console.error(
			'Directus RegistrationText fetch failed:',
			textRes.status,
			JSON.stringify(errorBody)
		);
		return json({ sent: 0, reason: 'Erreur lecture RegistrationText.' }, { status: 500 });
	}

	const { data: settings } = await textRes.json();

	if (!settings?.talent_day_active || !settings?.talent_day_date) {
		return json({ sent: 0, reason: 'Talent Day inactif ou sans date.' });
	}

	const today = new Date();
	const eventDate = new Date(settings.talent_day_date);
	const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

	if (eventDate.toDateString() !== tomorrow.toDateString()) {
		return json({ sent: 0, reason: "Ce n'est pas demain." });
	}

	const regRes = await fetch(
		`${PUBLIC_DIRECTUS_URL}/items/Registration?filter[type][_eq]=talent_days&filter[reminder_sent][_neq]=true`,
		{ headers: getAuthHeaders() }
	);

	if (!regRes.ok) {
		const errorBody = await regRes.json().catch(() => null);
		console.error('Directus Registration fetch failed:', regRes.status, JSON.stringify(errorBody));
		return json({ sent: 0, reason: 'Erreur lecture Registration.' }, { status: 500 });
	}

	const { data: registrations } = await regRes.json();

	const dateLabel = new Intl.DateTimeFormat('fr-BE', {
		day: 'numeric',
		month: 'long',
		year: 'numeric'
	}).format(eventDate);

	let sent = 0;
	for (const player of registrations ?? []) {
		try {
			await sendTalentDayReminderEmail({
				to: player.email,
				firstName: player.first_name,
				date: dateLabel
			});
			await fetch(`${PUBLIC_DIRECTUS_URL}/items/Registration/${player.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
				body: JSON.stringify({ reminder_sent: true })
			});
			sent++;
		} catch (err) {
			console.error(`Reminder failed for ${player.email}:`, err);
		}
	}

	return json({ sent });
};
