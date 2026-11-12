import { fail, redirect } from '@sveltejs/kit';
import { PUBLIC_DIRECTUS_URL } from '$env/static/public';
import { env } from '$env/dynamic/private';
import {
	sendAcceptanceEmail,
	sendRejectionEmail,
	sendCorrectionEmail,
	sendRegistrationConfirmationEmail,
	sendTalentDayReminderEmail,
	sendMakeupEmails,
	sendSecondChanceEmail,
	sendAcceptedInfoEmails,
	sendPaymentReminderEmail
} from '$lib/server/email';
import { cleanInstagram } from '$lib/instagram';
import { parseJsonField, patchRegistration } from '$lib/server/registrations';
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
		{ key: 'phone', label: 'Téléphone' }
	];

	// Talent Day : poste préféré + carte d'identité demandés à l'inscription.
	if (type === 'talent_days') {
		base.push(
			{ key: 'preferred_position', label: 'Poste préféré' },
			{ key: 'id_card_front', label: "Carte d'identité (recto)" },
			{ key: 'id_card_back', label: "Carte d'identité (verso)" }
		);
	}

	// Joueur accepté : tout le reste est demandé dans le formulaire de dossier.
	if (accepted) {
		for (const f of [
			{ key: 'preferred_position', label: 'Poste préféré' },
			{ key: 'id_card_front', label: "Carte d'identité (recto)" },
			{ key: 'id_card_back', label: "Carte d'identité (verso)" },
			{ key: 'birth_place', label: 'Lieu de naissance' },
			{ key: 'nationality', label: 'Nationalité' },
			{ key: 'address', label: 'Adresse postale' },
			{ key: 'postal_code', label: 'Code postal' },
			{ key: 'dossier', label: 'Dossier de candidature' }
		]) {
			if (!base.some((b) => b.key === f.key)) base.push(f);
		}
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
		return { players: [], loadError: true, talentDay: null, talentDayEdition: null };
	}

	const { data: registrations } = await res.json();

	const profilesRes = await fetch(
		`${PUBLIC_DIRECTUS_URL}/items/Players?limit=-1&fields=id,name,goals,assists,games,foot,height`,
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
			dossier: parseJsonField(r.dossier),
			paiements: parseJsonField(r.paiements) ?? [],
			presences: parseJsonField(r.presences) ?? {},
			stats: parseJsonField(r.stats) ?? {},
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
	let talentDayEdition: { date: string; passed: boolean; archived: boolean } | null = null;
	if (textRes.ok) {
		const { data: settings } = await textRes.json();
		if (settings?.talent_day_active && settings?.talent_day_date) {
			talentDay = { date: settings.talent_day_date };
		}
		if (settings?.talent_day_date) {
			const todayBrussels = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Brussels' });
			const d = String(settings.talent_day_date).slice(0, 10);
			// Les infos restent visibles 7 jours après l'événement, puis passent en historique.
			const limit = new Date(`${d}T00:00:00Z`);
			limit.setUTCDate(limit.getUTCDate() + 7);
			const archived = limit.toISOString().slice(0, 10) <= todayBrussels;
			talentDayEdition = {
				date: d,
				passed: d < todayBrussels || !settings.talent_day_active,
				archived
			};
		}
	}

	return { players, loadError: false, talentDay, talentDayEdition };
};

export const actions: Actions = {
	updateStatus: async ({ request, fetch }) => {
		const data = await request.formData();
		const id = data.get('id');
		const rawStatus = String(data.get('status') ?? 'pending');
		// "pending_correction" = remettre en attente ET envoyer l'email « envoyé par erreur »
		const wantsCorrection = rawStatus === 'pending_correction';
		// "rejected_second_chance" = refusé, mais avec l'email « seconde chance » (à la place de l'email de refus)
		const wantsSecondChance = rawStatus === 'rejected_second_chance';
		const status = wantsCorrection ? 'pending' : wantsSecondChance ? 'rejected' : rawStatus;

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
			if (wantsSecondChance) {
				await sendSecondChanceEmail({
					to: player.email,
					firstName: player.first_name,
					gender: player.gender
				});
			} else if (status === 'accepted' && prevStatus !== 'accepted') {
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
	// Le joueur ne souhaite plus continuer : il reste en base de données mais sort de tous les suivis.
	setInactive: async ({ request }) => {
		const data = await request.formData();
		const id = String(data.get('id') ?? '');
		const inactive = String(data.get('inactive') ?? '') === 'true';
		if (!id) return fail(400, { error: 'Joueur introuvable.' });

		const patch = await patchRegistration(id, { inactive });
		if (!patch.ok) {
			return fail(500, {
				error: "L'action a échoué : vérifie que le champ « inactive » (Boolean) existe dans Registration."
			});
		}
		return { success: true };
	},

	// Archiver / désarchiver une demande (sort des listes de travail, reste consultable).
	archivePlayer: async ({ request }) => {
		const data = await request.formData();
		const id = String(data.get('id') ?? '');
		const archived = String(data.get('archived') ?? '') === 'true';
		if (!id) return fail(400, { error: 'Joueur introuvable.' });

		const patch = await patchRegistration(id, { archived });
		if (!patch.ok) {
			return fail(500, {
				error: "L'archivage a échoué : vérifie que le champ « archived » (Boolean) existe dans Registration."
			});
		}
		return { success: true };
	},

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
			type: str('type') === 'academie' ? 'academie' : 'talent_days',
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

	// Paiements : on choisit une date, un type (et un mois), on coche les joueurs qui ont payé,
	// puis un seul clic enregistre tout. Un joueur déjà payé pour cette période est ignoré.
	savePayments: async ({ request, fetch }) => {
		const data = await request.formData();
		const type = String(data.get('type') ?? '');
		const date = String(data.get('date') ?? '');
		const mois = String(data.get('mois') ?? '');
		const ids = data.getAll('paid').map(String);

		if (!['annuel', 'mensuel'].includes(type)) return fail(400, { error: 'Type invalide.' });
		if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return fail(400, { error: 'Date de paiement invalide.' });
		if (type === 'mensuel' && !/^\d{4}-\d{2}$/.test(mois)) {
			return fail(400, { error: 'Choisis le mois concerné.' });
		}
		if (ids.length === 0) return fail(400, { error: 'Coche au moins un joueur.' });

		const res = await fetch(
			`${PUBLIC_DIRECTUS_URL}/items/Registration?filter[status][_eq]=accepted&limit=-1&fields=id,gender,paiements`,
			{ headers: getAuthHeaders() }
		);
		if (!res.ok) return fail(500, { error: 'Impossible de lire les joueurs.' });
		const rows: Record<string, any>[] = (await res.json()).data ?? [];

		let saved = 0;
		await Promise.all(
			rows
				.filter((r) => ids.includes(String(r.id)))
				.map(async (r) => {
					const parsed = parseJsonField(r.paiements);
					const list: Record<string, unknown>[] = Array.isArray(parsed) ? parsed : [];
					const already = list.some(
						(e) => e.type === type && (type === 'annuel' || e.mois === mois)
					);
					if (already) return;

					// Montant : 150 € (annuel), 80 € garçons / 50 € filles (mensuel).
					const g = String(r.gender ?? '').toLowerCase();
					const isFemale = ['fille', 'femme', 'female', 'f', 'girl', 'woman'].includes(g);
					const montant = type === 'annuel' ? 150 : isFemale ? 50 : 80;

					list.push({
						id: crypto.randomUUID(),
						type,
						mois: type === 'mensuel' ? mois : null,
						date,
						montant,
						...(String(data.get('note') ?? '').trim() ? { note: String(data.get('note')).trim() } : {})
					});
					const patch = await patchRegistration(r.id, { paiements: list });
					if (patch.ok) saved++;
				})
		);

		return { success: true, saved };
	},

	// Modifier la date et/ou la note d'un paiement déjà enregistré.
	updatePayment: async ({ request, fetch }) => {
		const data = await request.formData();
		const id = String(data.get('id') ?? '');
		const entry = String(data.get('entry') ?? '');
		const date = String(data.get('date') ?? '');
		const note = String(data.get('note') ?? '').trim();
		if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return fail(400, { error: 'Date invalide.' });

		const res = await fetch(`${PUBLIC_DIRECTUS_URL}/items/Registration/${id}?fields=paiements`, {
			headers: getAuthHeaders()
		});
		if (!res.ok) return fail(404, { error: 'Joueur introuvable.' });
		const parsedList = parseJsonField((await res.json()).data?.paiements);
		const list = Array.isArray(parsedList) ? (parsedList as Record<string, unknown>[]) : [];
		const next = list.map((e) => {
			if (e.id !== entry) return e;
			const updated: Record<string, unknown> = { ...e, date };
			if (note) updated.note = note;
			else delete updated.note;
			return updated;
		});

		const patch = await patchRegistration(id, { paiements: next });
		if (!patch.ok) return fail(500, { error: "La modification a échoué." });
		return { success: true };
	},

	// Note sur un mois (même impayé) : entrée « note » dans paiements.
	savePaymentNote: async ({ request, fetch }) => {
		const data = await request.formData();
		const id = String(data.get('id') ?? '');
		const mois = String(data.get('mois') ?? '');
		const note = String(data.get('note') ?? '').trim();
		if (!/^\d{4}-\d{2}$/.test(mois)) return fail(400, { error: 'Mois invalide.' });

		const res = await fetch(`${PUBLIC_DIRECTUS_URL}/items/Registration/${id}?fields=paiements`, {
			headers: getAuthHeaders()
		});
		if (!res.ok) return fail(404, { error: 'Joueur introuvable.' });
		const parsed = parseJsonField((await res.json()).data?.paiements);
		let list: Record<string, unknown>[] = Array.isArray(parsed) ? parsed : [];
		list = list.filter((e) => !(e.type === 'note' && e.mois === mois));
		if (note) {
			list.push({
				id: crypto.randomUUID(),
				type: 'note',
				mois,
				date: new Date().toISOString().slice(0, 10),
				montant: 0,
				note
			});
		}
		const patch = await patchRegistration(id, { paiements: list });
		if (!patch.ok) return fail(500, { error: "La note n'a pas pu être enregistrée." });
		return { success: true };
	},

	// Rappel par email pour une mensualité impayée (trace gardée dans « paiements »).
	sendPaymentReminder: async ({ request, fetch }) => {
		const data = await request.formData();
		const id = String(data.get('id') ?? '');
		const mois = String(data.get('mois') ?? '');
		if (!/^\d{4}-\d{2}$/.test(mois)) return fail(400, { error: 'Mois invalide.' });

		const res = await fetch(
			`${PUBLIC_DIRECTUS_URL}/items/Registration/${id}?fields=id,email,first_name,gender,paiements`,
			{ headers: getAuthHeaders() }
		);
		if (!res.ok) return fail(404, { error: 'Joueur introuvable.' });
		const r = (await res.json()).data;
		if (!r?.email) return fail(400, { error: "Ce joueur n'a pas d'email." });

		const parsed = parseJsonField(r.paiements);
		const list: Record<string, unknown>[] = Array.isArray(parsed) ? parsed : [];
		if (list.some((e) => e.type === 'mensuel' && e.mois === mois)) {
			return fail(400, { error: 'Cette mensualité est déjà payée.' });
		}

		const g = String(r.gender ?? '').toLowerCase();
		const isFemale = ['fille', 'femme', 'female', 'f', 'girl', 'woman'].includes(g);
		const [y, m] = mois.split('-').map(Number);
		const months = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
		try {
			await sendPaymentReminderEmail({
				to: r.email,
				firstName: r.first_name,
				monthLabel: `${months[m - 1]} ${y}`,
				amount: isFemale ? 50 : 80
			});
		} catch (err) {
			console.error('Payment reminder failed:', err);
			return fail(500, { error: "L'email n'a pas pu être envoyé." });
		}

		list.push({
			id: crypto.randomUUID(),
			type: 'rappel',
			mois,
			date: new Date().toISOString().slice(0, 10),
			montant: 0
		});
		await patchRegistration(id, { paiements: list });
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
		const parsedList = parseJsonField((await res.json()).data?.paiements);
		const next = Array.isArray(parsedList)
			? (parsedList as Record<string, unknown>[]).filter((e) => e.id !== entry)
			: [];

		const patch = await patchRegistration(id as string, { paiements: next });
		if (!patch.ok) return fail(500, { error: "La suppression a échoué." });
		return { success: true };
	},

	// Envoie l'email « viens te tester ce week-end » à tous les absents du Talent Day
	// (présence = « Pas venu ») qui ne l'ont pas encore reçu.
	sendMakeup: async ({ fetch }) => {
		const res = await fetch(
			`${PUBLIC_DIRECTUS_URL}/items/Registration?filter[type][_eq]=talent_days&filter[venue][_eq]=false&limit=-1&fields=id,email,first_name,gender,rattrapage_envoye`,
			{ headers: getAuthHeaders() }
		);
		if (!res.ok) return fail(500, { error: 'Impossible de lire les inscrits.' });
		const rows: Record<string, any>[] = (await res.json()).data ?? [];
		const targets = rows.filter((r) => r.email && r.rattrapage_envoye !== true);

		if (targets.length === 0) {
			return fail(400, { error: "Aucun absent à contacter (marque d'abord les « Pas venu »)." });
		}

		try {
			await sendMakeupEmails(
				targets.map((r) => ({ to: r.email, firstName: r.first_name, gender: r.gender }))
			);
		} catch (err) {
			console.error('Makeup emails failed:', err);
			return fail(502, {
				error: `Emails non envoyés : ${err instanceof Error ? err.message : String(err)}`
			});
		}

		await Promise.all(
			targets.map((r) =>
				fetch(`${PUBLIC_DIRECTUS_URL}/items/Registration/${r.id}`, {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
					body: JSON.stringify({ rattrapage_envoye: true })
				}).catch(() => null)
			)
		);

		return { success: true, makeupSent: targets.length };
	},

	// Présences : une date, un statut par joueur, un seul clic pour tout enregistrer.
	savePresences: async ({ request, fetch }) => {
		const data = await request.formData();
		const date = String(data.get('date') ?? '');
		if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return fail(400, { error: 'Date invalide.' });

		const wanted = new Map<string, string>();
		for (const [key, value] of data.entries()) {
			if (key.startsWith('s_') && ['present', 'absent', 'clear'].includes(String(value))) {
				wanted.set(key.slice(2), String(value));
			}
		}
		if (wanted.size === 0) return fail(400, { error: 'Choisis Présent ou Absent pour au moins un joueur.' });

		const res = await fetch(
			`${PUBLIC_DIRECTUS_URL}/items/Registration?filter[status][_eq]=accepted&limit=-1&fields=id,presences`,
			{ headers: getAuthHeaders() }
		);
		if (!res.ok) return fail(500, { error: 'Impossible de lire les joueurs.' });
		const rows: Record<string, any>[] = (await res.json()).data ?? [];

		let saved = 0;
		await Promise.all(
			rows
				.filter(
					(r) =>
						wanted.has(String(r.id)) &&
						(wanted.get(String(r.id)) === 'clear'
							? parseJsonField<Record<string, string>>(r.presences)?.[date] !== undefined
							: wanted.get(String(r.id)) !== parseJsonField<Record<string, string>>(r.presences)?.[date])
				)
				.map(async (r) => {
					const presences: Record<string, string> = {
						...(parseJsonField<Record<string, string>>(r.presences) ?? {})
					};
					const choice = wanted.get(String(r.id));
					if (choice === 'clear') delete presences[date];
					else presences[date] = choice as string;
					const patch = await patchRegistration(r.id, { presences });
					if (patch.ok) saved++;
				})
		);

		return { success: true, saved };
	},

	// Envoie à tous les joueurs acceptés l'email d'information (entraînement du dimanche, cash, formulaire).
	sendAcceptedInfo: async ({ fetch }) => {
		const res = await fetch(
			`${PUBLIC_DIRECTUS_URL}/items/Registration?filter[status][_eq]=accepted&limit=-1&fields=id,email,first_name,gender,dossier`,
			{ headers: getAuthHeaders() }
		);
		if (!res.ok) return fail(500, { error: 'Impossible de lire les joueurs acceptés.' });
		const rows: Record<string, any>[] = (await res.json()).data ?? [];
		const targets = rows.filter((r) => r.email);
		if (targets.length === 0) return fail(400, { error: 'Aucun joueur accepté.' });

		try {
			await sendAcceptedInfoEmails(
				targets.map((r) => ({
					to: r.email,
					firstName: r.first_name,
					gender: r.gender,
					formDone: !!parseJsonField(r.dossier)
				}))
			);
		} catch (err) {
			console.error('Accepted info emails failed:', err);
			return fail(502, {
				error: `Emails non envoyés : ${err instanceof Error ? err.message : String(err)}`
			});
		}
		return { success: true, sent: targets.length };
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
		const registrationId = String(data.get('id') ?? '');
		const stats = {
			height: numOrNull(data.get('height')),
			goals: numOrNull(data.get('goals')),
			assists: numOrNull(data.get('assists')),
			games: numOrNull(data.get('games')),
			foot: String(data.get('foot') ?? '') || null
		};

		// Fiche publique « Players » existante : on la met à jour (visible sur le site).
		if (profileId) {
			const res = await fetch(`${PUBLIC_DIRECTUS_URL}/items/Players/${profileId}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
				body: JSON.stringify(stats)
			});

			if (!res.ok) {
				const errorBody = await res.json().catch(() => null);
				console.error('Directus Players update failed:', res.status, JSON.stringify(errorBody));
				return fail(500, { error: "Les statistiques n'ont pas pu être enregistrées." });
			}
			return { success: true };
		}

		// Pas de fiche publique : les stats sont gardées sur l'inscription (privé, pas sur le site).
		if (!registrationId) return fail(400, { error: 'Joueur introuvable.' });
		const patch = await patchRegistration(registrationId, { stats });
		if (!patch.ok) {
			return fail(500, { error: "Les statistiques n'ont pas pu être enregistrées (champ « stats » ?)." });
		}
		return { success: true };
	}
};
