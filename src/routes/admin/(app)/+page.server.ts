import { fail, redirect } from '@sveltejs/kit';
import { PUBLIC_DIRECTUS_URL } from '$env/static/public';
import { env } from '$env/dynamic/private';
import {
	sendAcceptanceEmail,
	sendRejectionEmail,
	sendCorrectionEmail,
	sendRegistrationConfirmationEmail,
	sendTalentDayReminderEmail,
	sendMakeupEmails
} from '$lib/server/email';
import { cleanInstagram } from '$lib/instagram';
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

function requiredFieldsFor(type: string, accepted = false) {
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

	// Formulaire de base « Rejoindre l'académie »
	if (type === 'academie' && !accepted) {
		base.push(
			{ key: 'birth_place', label: 'Lieu de naissance' },
			{ key: 'nationality', label: 'Nationalité' },
			{ key: 'address', label: 'Adresse postale' },
			{ key: 'postal_code', label: 'Code postal' }
		);
	}

	// Joueur accepté : il doit avoir complété le grand formulaire (dossier).
	if (accepted) base.push({ key: 'dossier', label: 'Dossier de candidature' });

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
		const fields = requiredFieldsFor(r.type, r.status === 'accepted');
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
		const rawStatus = String(data.get('status') ?? 'pending');
		// "pending_correction" = remettre en attente ET envoyer l'email « envoyé par erreur »
		const wantsCorrection = rawStatus === 'pending_correction';
		const status = wantsCorrection ? 'pending' : rawStatus;

		// Statut actuel : on n'envoie un email que si le statut change réellement.
		const prevRes = await fetch(`${PUBLIC_DIRECTUS_URL}/items/Registration/${id}?fields=status`, {
			headers: getAuthHeaders()
		});
		const prevStatus = prevRes.ok ? ((await prevRes.json()).data?.status ?? 'pending') : null;

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

		let emailFailed = false;
		try {
			if (status === 'accepted' && prevStatus !== 'accepted') {
				await sendAcceptanceEmail({
					to: player.email,
					firstName: player.first_name,
					gender: player.gender
				});
			} else if (status === 'rejected' && prevStatus !== 'rejected') {
				await sendRejectionEmail({ to: player.email, firstName: player.first_name });
			} else if (wantsCorrection && prevStatus === 'accepted') {
				await sendCorrectionEmail({ to: player.email, firstName: player.first_name });
			}
		} catch (err) {
			console.error('Status email failed:', err);
			emailFailed = true;
		}

		return { success: true, emailFailed };
	},

	// Renvoie l'email de confirmation d'inscription à un joueur qui ne l'a pas reçu.
	resendConfirmation: async ({ request, fetch }) => {
		const data = await request.formData();
		const id = data.get('id');

		const res = await fetch(`${PUBLIC_DIRECTUS_URL}/items/Registration/${id}`, {
			headers: getAuthHeaders()
		});
		if (!res.ok) return fail(404, { error: 'Joueur introuvable.' });
		const { data: r } = await res.json();

		let talentDayDate = '';
		if (r.type === 'talent_days') {
			const textRes = await fetch(`${PUBLIC_DIRECTUS_URL}/items/RegistrationText`, {
				headers: getAuthHeaders()
			});
			if (textRes.ok) {
				const { data: settings } = await textRes.json();
				talentDayDate = settings?.talent_day_date
					? new Intl.DateTimeFormat('fr-BE', {
							day: 'numeric',
							month: 'long',
							year: 'numeric'
						}).format(new Date(settings.talent_day_date))
					: '';
			}
		}

		let sent = false;
		let errorMessage = '';
		try {
			await sendRegistrationConfirmationEmail({
				to: r.email,
				firstName: r.first_name,
				type: r.type === 'talent_days' ? 'talent_days' : 'academie',
				talentDayDate: talentDayDate || undefined
			});
			sent = true;
		} catch (err) {
			errorMessage = err instanceof Error ? err.message : String(err);
			console.error('Resend confirmation failed:', err);
		}

		const patch = (body: Record<string, unknown>) =>
			fetch(`${PUBLIC_DIRECTUS_URL}/items/Registration/${id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
				body: JSON.stringify(body)
			}).catch(() => null);
		await patch({ email_envoye: sent });
		if (!sent) await patch({ email_erreur: errorMessage.slice(0, 500) });

		if (!sent) return fail(502, { error: `Email non envoyé : ${errorMessage}` });
		return { success: true };
	},

	// Envoie le rappel du Talent Day à un joueur, à la main.
	sendReminder: async ({ request, fetch }) => {
		const data = await request.formData();
		const id = data.get('id');

		const res = await fetch(`${PUBLIC_DIRECTUS_URL}/items/Registration/${id}`, {
			headers: getAuthHeaders()
		});
		if (!res.ok) return fail(404, { error: 'Joueur introuvable.' });
		const { data: r } = await res.json();

		const textRes = await fetch(`${PUBLIC_DIRECTUS_URL}/items/RegistrationText`, {
			headers: getAuthHeaders()
		});
		const settings = textRes.ok ? (await textRes.json()).data : null;
		if (!settings?.talent_day_date) return fail(400, { error: 'Date du Talent Day manquante.' });

		const eventDate = new Date(settings.talent_day_date);
		const dateLabel = new Intl.DateTimeFormat('fr-BE', {
			day: 'numeric',
			month: 'long',
			year: 'numeric'
		}).format(eventDate);
		const todayBrussels = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Brussels' }).format(
			new Date()
		);
		const when = String(settings.talent_day_date).slice(0, 10) === todayBrussels ? "aujourd'hui" : 'demain';

		try {
			await sendTalentDayReminderEmail({
				to: r.email,
				firstName: r.first_name,
				date: dateLabel,
				when
			});
		} catch (err) {
			console.error('Manual reminder failed:', err);
			return fail(502, {
				error: `Rappel non envoyé : ${err instanceof Error ? err.message : String(err)}`
			});
		}

		await fetch(`${PUBLIC_DIRECTUS_URL}/items/Registration/${id}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
			body: JSON.stringify({ reminder_sent: true })
		}).catch(() => null);

		return { success: true };
	},

	// Présence au Talent Day : oui / non (ou vide pour annuler).
	updateVenue: async ({ request, fetch }) => {
		const data = await request.formData();
		const id = data.get('id');
		const v = String(data.get('venue') ?? '');
		const venue = v === 'true' ? true : v === 'false' ? false : null;

		const res = await fetch(`${PUBLIC_DIRECTUS_URL}/items/Registration/${id}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
			body: JSON.stringify({ venue })
		});
		if (!res.ok) {
			const errorBody = await res.json().catch(() => null);
			console.error('Directus venue update failed:', res.status, JSON.stringify(errorBody));
			return fail(500, { error: 'La présence n\'a pas pu être enregistrée.' });
		}
		return { success: true };
	},

	// Ajoute à la main un joueur au Talent Day (sans carte d'identité).
	addPlayer: async ({ request, fetch }) => {
		const data = await request.formData();
		const str = (k: string) => String(data.get(k) ?? '').trim();
		const first_name = str('first_name');
		const last_name = str('last_name');
		const email = str('email').toLowerCase();

		if (!first_name || !last_name) {
			return fail(400, { addError: 'Prénom et nom obligatoires.' });
		}

		const payload: Record<string, unknown> = {
			type: 'talent_days',
			first_name,
			last_name,
			email: email || null,
			phone: str('phone') || null,
			gender: str('gender') || null,
			birth_date: str('birth_date') || null,
			preferred_position: str('preferred_position') || null,
			current_club: str('current_club') || null,
			instagram: cleanInstagram(str('instagram')) || null
		};

		// Même chemin que le formulaire public : le rôle Public peut créer, le jeton du site non.
		const res = await fetch(`${PUBLIC_DIRECTUS_URL}/items/Registration`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload)
		});
		if (!res.ok) {
			const errorBody = await res.json().catch(() => null);
			console.error('Manual add failed:', res.status, JSON.stringify(errorBody));
			const msg = errorBody?.errors?.[0]?.message;
			return fail(500, { addError: `Ajout impossible${msg ? ` : ${msg}` : '.'}` });
		}
		return { success: true };
	},

	// Paiements : chaque paiement est une ligne avec sa date, son type et son montant.
	addPayment: async ({ request, fetch }) => {
		const data = await request.formData();
		const id = data.get('id');
		const type = String(data.get('type') ?? '');
		const date = String(data.get('date') ?? '');
		const mois = String(data.get('mois') ?? '');
		const montantRaw = String(data.get('montant') ?? '').replace(',', '.').trim();

		if (!['annuel', 'mensuel'].includes(type)) return fail(400, { error: 'Type invalide.' });
		if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return fail(400, { error: 'Date de paiement invalide.' });
		if (type === 'mensuel' && !/^\d{4}-\d{2}$/.test(mois)) {
			return fail(400, { error: 'Choisis le mois concerné.' });
		}

		const res = await fetch(`${PUBLIC_DIRECTUS_URL}/items/Registration/${id}?fields=paiements,gender`, {
			headers: getAuthHeaders()
		});
		if (!res.ok) return fail(404, { error: 'Joueur introuvable.' });
		const row = (await res.json()).data ?? {};
		const list: Record<string, unknown>[] = Array.isArray(row.paiements) ? row.paiements : [];

		// Montant par défaut : 150 € (annuel), 80 € garçons / 50 € filles (mensuel).
		const g = String(row.gender ?? '').toLowerCase();
		const isFemale = ['fille', 'femme', 'female', 'f', 'girl', 'woman'].includes(g);
		const defaultAmount = type === 'annuel' ? 150 : isFemale ? 50 : 80;
		const montant = montantRaw && Number.isFinite(Number(montantRaw)) ? Number(montantRaw) : defaultAmount;

		list.push({
			id: crypto.randomUUID(),
			type,
			mois: type === 'mensuel' ? mois : null,
			date,
			montant
		});

		const patch = await fetch(`${PUBLIC_DIRECTUS_URL}/items/Registration/${id}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
			body: JSON.stringify({ paiements: list })
		});
		if (!patch.ok) {
			const errorBody = await patch.json().catch(() => null);
			console.error('Payment add failed:', patch.status, JSON.stringify(errorBody));
			return fail(500, { error: "Le paiement n'a pas pu être enregistré." });
		}
		return { success: true };
	},

	deletePayment: async ({ request, fetch }) => {
		const data = await request.formData();
		const id = data.get('id');
		const entry = String(data.get('entry') ?? '');

		const res = await fetch(`${PUBLIC_DIRECTUS_URL}/items/Registration/${id}?fields=paiements`, {
			headers: getAuthHeaders()
		});
		if (!res.ok) return fail(404, { error: 'Joueur introuvable.' });
		const list: Record<string, unknown>[] = (await res.json()).data?.paiements ?? [];
		const next = Array.isArray(list) ? list.filter((e) => e.id !== entry) : [];

		const patch = await fetch(`${PUBLIC_DIRECTUS_URL}/items/Registration/${id}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
			body: JSON.stringify({ paiements: next })
		});
		if (!patch.ok) return fail(500, { error: "La suppression a échoué." });
		return { success: true };
	},

	// Présences des joueurs de l'académie : un statut par joueur et par séance (date).
	updatePresence: async ({ request, fetch }) => {
		const data = await request.formData();
		const id = data.get('id');
		const date = String(data.get('date') ?? '');
		const status = String(data.get('status') ?? '');

		if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return fail(400, { error: 'Date invalide.' });
		if (!['present', 'absent', 'excuse', ''].includes(status)) {
			return fail(400, { error: 'Statut invalide.' });
		}

		const res = await fetch(`${PUBLIC_DIRECTUS_URL}/items/Registration/${id}?fields=presences`, {
			headers: getAuthHeaders()
		});
		if (!res.ok) return fail(404, { error: 'Joueur introuvable.' });
		const presences = { ...((await res.json()).data?.presences ?? {}) };

		if (status) presences[date] = status;
		else delete presences[date];

		const patch = await fetch(`${PUBLIC_DIRECTUS_URL}/items/Registration/${id}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
			body: JSON.stringify({ presences })
		});
		if (!patch.ok) {
			const errorBody = await patch.json().catch(() => null);
			console.error('Presence update failed:', patch.status, JSON.stringify(errorBody));
			return fail(500, { error: "La présence n'a pas pu être enregistrée." });
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
			instagram: cleanInstagram(String(data.get('instagram') ?? '')),
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
