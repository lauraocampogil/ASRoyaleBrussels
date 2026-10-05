import { fail, redirect } from '@sveltejs/kit';
import { PUBLIC_DIRECTUS_URL } from '$env/static/public';
import { env } from '$env/dynamic/private';
import { sendAcceptanceEmail, sendRejectionEmail } from '$lib/server/email';
import type { Actions, PageServerLoad } from './$types';

async function uploadFile(file: File, fetchFn: typeof fetch): Promise<string> {
	const arrayBuffer = await file.arrayBuffer();
	const fileBlob = new Blob([arrayBuffer], { type: file.type });
	const uploadForm = new FormData();
	uploadForm.append('file', fileBlob, file.name);

	const uploadRes = await fetchFn(`${PUBLIC_DIRECTUS_URL}/files`, {
		method: 'POST',
		body: uploadForm,
		headers: getAuthHeaders()
	});

	if (!uploadRes.ok) {
		const errorBody = await uploadRes.json().catch(() => null);
		console.error('ID card upload failed:', uploadRes.status, JSON.stringify(errorBody));
		throw new Error('upload_failed');
	}

	const uploaded = await uploadRes.json();
	return uploaded.data.id;
}

function getAuthHeaders() {
	return { Authorization: `Bearer ${env.DIRECTUS_SERVICE_TOKEN}` };
}

function requiredFieldsFor(type: string) {
	const base = [
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

	if (type === 'academie') {
		base.push(
			{ key: 'birth_place', label: 'Lieu de naissance' },
			{ key: 'nationality', label: 'Nationalité' },
			{ key: 'address', label: 'Adresse postale' },
			{ key: 'postal_code', label: 'Code postal' }
		);
	}

	return base;
}

function nameKey(name: string) {
	return (name ?? '')
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9\s]/g, ' ')
		.split(/\s+/)
		.filter(Boolean)
		.sort()
		.join(' ');
}

function numOrNull(value: FormDataEntryValue | null) {
	const v = String(value ?? '').trim();
	if (v === '') return null;
	const n = Number(v.replace(',', '.'));
	return Number.isFinite(n) ? n : null;
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

	const profilesRes = await fetch(
		`${PUBLIC_DIRECTUS_URL}/items/Players?limit=-1&fields=id,name,goals,assists,foot,height`,
		{ headers: getAuthHeaders() }
	);
	const profiles: Record<string, any>[] = profilesRes.ok
		? ((await profilesRes.json()).data ?? [])
		: [];
	const profileByName = new Map(profiles.map((p) => [nameKey(p.name), p]));

	const players = (registrations ?? []).map((r: Record<string, any>) => {
		// Une fois accepté, le joueur devient membre de l'académie : les infos
		// complètes deviennent requises, même s'il est arrivé via Talent Day.
		const effectiveType = r.status === 'accepted' ? 'academie' : r.type;
		const fields = requiredFieldsFor(effectiveType);
		const missing = fields.filter(({ key }) => !r[key]).map(({ label }) => label);
		const siteProfile = profileByName.get(nameKey(`${r.first_name} ${r.last_name}`)) ?? null;
		return {
			...r,
			missing,
			complete: missing.length === 0,
			status: r.status ?? 'pending',
			siteProfile
		};
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

		const payload: Record<string, any> = {
			first_name: String(data.get('first_name') ?? ''),
			last_name: String(data.get('last_name') ?? ''),
			birth_date: String(data.get('birth_date') ?? ''),
			gender: String(data.get('gender') ?? ''),
			phone: String(data.get('phone') ?? ''),
			preferred_position: String(data.get('preferred_position') ?? ''),
			current_club: String(data.get('current_club') ?? ''),
			division: String(data.get('division') ?? ''),
			email: String(data.get('email') ?? ''),
			birth_place: String(data.get('birth_place') ?? ''),
			nationality: String(data.get('nationality') ?? ''),
			address: String(data.get('address') ?? ''),
			postal_code: String(data.get('postal_code') ?? '')
		};

		const idFront = data.get('id_card_front');
		if (idFront instanceof File && idFront.size > 0) {
			try {
				payload.id_card_front = await uploadFile(idFront, fetch);
			} catch {
				return fail(500, { error: "L'envoi du recto a échoué." });
			}
		}

		const idBack = data.get('id_card_back');
		if (idBack instanceof File && idBack.size > 0) {
			try {
				payload.id_card_back = await uploadFile(idBack, fetch);
			} catch {
				return fail(500, { error: "L'envoi du verso a échoué." });
			}
		}

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
	},
	updateStats: async ({ request, fetch }) => {
		const data = await request.formData();
		const profileId = String(data.get('profile_id') ?? '');

		if (!profileId) {
			return fail(400, { error: 'Aucune fiche du site liée à ce joueur.' });
		}

		const res = await fetch(`${PUBLIC_DIRECTUS_URL}/items/Players/${profileId}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
			body: JSON.stringify({
				height: numOrNull(data.get('height')),
				goals: numOrNull(data.get('goals')),
				assists: numOrNull(data.get('assists')),
				foot: String(data.get('foot') ?? '') || null
			})
		});

		if (!res.ok) {
			const errorBody = await res.json().catch(() => null);
			console.error('Directus Players update failed:', res.status, JSON.stringify(errorBody));
			return fail(500, { error: "Les statistiques n'ont pas pu être enregistrées." });
		}

		return { success: true };
	}
};
