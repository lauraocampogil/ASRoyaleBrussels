import { fail, redirect } from '@sveltejs/kit';
import { PUBLIC_DIRECTUS_URL } from '$env/static/public';
import { DIRECTUS_SERVICE_TOKEN } from '$env/static/private';
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

const authHeaders = { Authorization: `Bearer ${DIRECTUS_SERVICE_TOKEN}` };

export const load: PageServerLoad = async ({ fetch }) => {
	const res = await fetch(`${PUBLIC_DIRECTUS_URL}/items/Registration?sort=-date_created&limit=-1`, {
		headers: authHeaders
	});
	const { data: registrations } = await res.json();

	const players = (registrations ?? []).map((r: Record<string, any>) => {
		const missing = REQUIRED_FIELDS.filter(({ key }) => !r[key]).map(({ label }) => label);
		return { ...r, missing, complete: missing.length === 0 };
	});

	return { players };
};

export const actions: Actions = {
	toggleAccepted: async ({ request, fetch }) => {
		const data = await request.formData();
		const id = data.get('id');
		const accepted = data.get('accepted') === 'true';

		const res = await fetch(`${PUBLIC_DIRECTUS_URL}/items/Registration/${id}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json', ...authHeaders },
			body: JSON.stringify({ accepted, accepted_at: accepted ? new Date().toISOString() : null })
		});

		if (!res.ok) {
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
