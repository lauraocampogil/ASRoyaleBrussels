import { fail, redirect } from '@sveltejs/kit';
import { PUBLIC_DIRECTUS_URL } from '$env/static/public';
import { env } from '$env/dynamic/private';
import { sendAcceptanceEmail } from '$lib/server/email';
import type { Actions, PageServerLoad } from './$types';

const REQUIRED_FIELDS: { key: string; label: string }[] = [
	{ key: 'first_name', label: 'Prénom' },
	{ key: 'last_name', label: 'Nom' },
	{ key: 'birth_date', label: 'Date de naissance' },
	{ key: 'email', label: 'Email' },
	{ key: 'phone', label: 'Téléphone' },
	{ key: 'preferred_position', label: 'Poste préféré' }
];

function getAuthHeaders() {
	return { Authorization: `Bearer ${env.DIRECTUS_SERVICE_TOKEN}` };
}

export const load: PageServerLoad = async ({ fetch }) => {
	const res = await fetch(`${PUBLIC_DIRECTUS_URL}/items/Registration?sort=-date_created&limit=-1`, {
		headers: getAuthHeaders()
	});

	if (!res.ok) {
		const errorBody = await res.json().catch(() => null);
		console.error('Directus Registration fetch failed:', res.status, JSON.stringify(errorBody));
		return { players: [], loadError: true };
	}

	const { data: registrations } = await res.json();

	const players = (registrations ?? []).map((r: Record<string, any>) => {
		const missing = REQUIRED_FIELDS.filter(({ key }) => !r[key]).map(({ label }) => label);
		return { ...r, missing, complete: missing.length === 0 };
	});

	return { players, loadError: false };
};

export const actions: Actions = {
	toggleAccepted: async ({ request, fetch }) => {
		const data = await request.formData();
		const id = data.get('id');
		const accepted = data.get('accepted') === 'true';

		const res = await fetch(`${PUBLIC_DIRECTUS_URL}/items/Registration/${id}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
			body: JSON.stringify({ accepted, accepted_at: accepted ? new Date().toISOString() : null })
		});

		if (!res.ok) {
			const errorBody = await res.json().catch(() => null);
			console.error('Directus Registration update failed:', res.status, JSON.stringify(errorBody));
			return fail(500, { error: 'La mise à jour a échoué.' });
		}

		if (accepted) {
			const { data: player } = await res.json();
			try {
				await sendAcceptanceEmail({ to: player.email, firstName: player.first_name });
			} catch (err) {
				console.error('Acceptance email failed:', err);
			}
		}

		return { success: true };
	},

	logout: async ({ cookies }) => {
		cookies.delete('staff_session', { path: '/' });
		throw redirect(303, '/admin/login');
	}
};
