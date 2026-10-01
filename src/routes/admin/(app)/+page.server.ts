import { fail, redirect } from '@sveltejs/kit';
import { PUBLIC_DIRECTUS_URL } from '$env/static/public';
import { env } from '$env/dynamic/private';
import { sendAcceptanceEmail, sendRejectionEmail } from '$lib/server/email';
import type { Actions, PageServerLoad } from './$types';

function getAuthHeaders() {
	return { Authorization: `Bearer ${env.DIRECTUS_SERVICE_TOKEN}` };
}

function requiredFieldsFor(type: string) {
	return [
		{ key: 'first_name', label: 'Prénom' },
		{ key: 'last_name', label: 'Nom' },
		{ key: 'birth_date', label: 'Date de naissance' },
		{ key: 'gender', label: 'Genre' },
		{ key: 'email', label: 'Email' },
		{ key: 'phone', label: 'Téléphone' },
		{ key: 'preferred_position', label: 'Poste préféré' },
		{ key: 'id_card_front', label: "Carte d'identité (recto)" },
		{ key: 'id_card_back', label: "Carte d'identité (verso)" }
	];
}

export const load: PageServerLoad = async ({ fetch }) => {
	const res = await fetch(`${PUBLIC_DIRECTUS_URL}/items/Registration?sort=-id&limit=-1`, {
		headers: getAuthHeaders()
	});

	if (!res.ok) {
		const errorBody = await res.json().catch(() => null);
		console.error('Directus Registration fetch failed:', res.status, JSON.stringify(errorBody));
		return { players: [], loadError: true, talentDay: null };
	}

	const { data: registrations } = await res.json();

	const players = (registrations ?? []).map((r: Record<string, any>) => {
		const fields = requiredFieldsFor(r.type);
		const missing = fields.filter(({ key }) => !r[key]).map(({ label }) => label);
		return { ...r, missing, complete: missing.length === 0, status: r.status ?? 'pending' };
	});

	const textRes = await fetch(`${PUBLIC_DIRECTUS_URL}/items/RegistrationText`, {
		headers: getAuthHeaders()
	});
	let talentDay = null;
	if (textRes.ok) {
		const { data: settings } = await textRes.json();
		if (settings?.talent_day_active && settings?.talent_day_date) {
			talentDay = { date: settings.talent_day_date };
		}
	}

	return { players, loadError: false, talentDay };
};

export const actions: Actions = {
	updateStatus: async ({ request, fetch }) => {
		const data = await request.formData();
		const id = data.get('id');
		const status = String(data.get('status') ?? 'pending');

		const res = await fetch(`${PUBLIC_DIRECTUS_URL}/items/Registration/${id}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
			body: JSON.stringify({
				status,
				decided_at: status === 'pending' ? null : new Date().toISOString()
			})
		});

		if (!res.ok) {
			const errorBody = await res.json().catch(() => null);
			console.error('Directus Registration update failed:', res.status, JSON.stringify(errorBody));
			return fail(500, { error: 'La mise à jour a échoué.' });
		}

		const { data: player } = await res.json();

		try {
			if (status === 'accepted') {
				await sendAcceptanceEmail({ to: player.email, firstName: player.first_name });
			} else if (status === 'rejected') {
				await sendRejectionEmail({ to: player.email, firstName: player.first_name });
			}
		} catch (err) {
			console.error('Status email failed:', err);
		}

		return { success: true };
	},

	logout: async ({ cookies }) => {
		cookies.delete('staff_session', { path: '/' });
		throw redirect(303, '/admin/login');
	},

	updatePlayer: async ({ request, fetch }) => {
		const data = await request.formData();
		const id = data.get('id');

		const payload = {
			first_name: String(data.get('first_name') ?? ''),
			last_name: String(data.get('last_name') ?? ''),
			birth_date: String(data.get('birth_date') ?? ''),
			phone: String(data.get('phone') ?? ''),
			preferred_position: String(data.get('preferred_position') ?? ''),
			current_club: String(data.get('current_club') ?? ''),
			division: String(data.get('division') ?? ''),
			email: String(data.get('email') ?? '')
		};

		const res = await fetch(`${PUBLIC_DIRECTUS_URL}/items/Registration/${id}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
			body: JSON.stringify(payload)
		});

		if (!res.ok) {
			const errorBody = await res.json().catch(() => null);
			console.error('Directus Registration update failed:', res.status, JSON.stringify(errorBody));
			return fail(500, { error: 'La mise à jour a échoué.' });
		}

		return { success: true };
	}
};
