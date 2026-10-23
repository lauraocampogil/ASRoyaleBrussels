import { fail } from '@sveltejs/kit';
import { PUBLIC_DIRECTUS_URL } from '$env/static/public';
import { env } from '$env/dynamic/private';
import { cleanInstagram } from '$lib/instagram';
import type { Actions, PageServerLoad } from './$types';
import { sendRegistrationConfirmationEmail } from '$lib/server/email';
import { looksLikeIdDocument } from '$lib/server/idVerification';
import { findAcceptedByEmail, completeRegistration } from '$lib/server/registrations';

export const load: PageServerLoad = async ({ fetch }) => {
	const res = await fetch(`${PUBLIC_DIRECTUS_URL}/items/RegistrationText`);
	const { data } = await res.json();

	const talentDayActive = data?.talent_day_active ?? false;
	const academyActive = data?.academy_active ?? false;
	const talentDayDate = data?.talent_day_date
		? new Intl.DateTimeFormat('fr-BE', { day: 'numeric', month: 'long', year: 'numeric' }).format(
				new Date(data.talent_day_date)
			)
		: '';

	return {
		eyebrow: data?.eyebrow ?? '',
		title: data?.title ?? '',
		logo: data?.logo
			? `${PUBLIC_DIRECTUS_URL}/assets/${data.logo}?width=160&quality=80&format=webp`
			: '',
		talentDayActive,
		academyActive,
		talentDayDate
	};
};

async function uploadFile(file: File, fetchFn: typeof fetch): Promise<string> {
	const arrayBuffer = await file.arrayBuffer();
	const fileBlob = new Blob([arrayBuffer], { type: file.type });

	const uploadForm = new FormData();
	uploadForm.append('file', fileBlob, file.name);

	// Jusqu'à 3 essais : un 502 ponctuel du serveur Directus ne doit pas bloquer le joueur.
	for (let attempt = 1; attempt <= 3; attempt++) {
		const uploadRes = await fetchFn(`${PUBLIC_DIRECTUS_URL}/files`, {
			method: 'POST',
			body: uploadForm
		}).catch(() => null);

		if (uploadRes?.ok) {
			const uploaded = await uploadRes.json();
			return uploaded.data.id;
		}

		const errorBody = uploadRes ? await uploadRes.json().catch(() => null) : null;
		console.error(
			`Directus file upload failed (essai ${attempt}):`,
			uploadRes?.status,
			JSON.stringify(errorBody)
		);
		if (attempt < 3) await new Promise((r) => setTimeout(r, 700 * attempt));
	}
	throw new Error('upload_failed');
}

export const actions: Actions = {
	default: async ({ request, fetch, platform }) => {
		const data = await request.formData();

		const type = data.get('type')?.toString() ?? '';
		const isAcademie = type === 'academie';

		const values = {
			type,
			first_name: data.get('first_name')?.toString() ?? '',
			last_name: data.get('last_name')?.toString() ?? '',
			birth_date: data.get('birth_date')?.toString() ?? '',
			gender: data.get('gender')?.toString() ?? '',
			preferred_position: data.get('preferred_position')?.toString() ?? '',
			birth_place: data.get('birth_place')?.toString() || null,
			nationality: data.get('nationality')?.toString() || null,
			address: data.get('address')?.toString() || null,
			postal_code: data.get('postal_code')?.toString() || null,
			current_club: data.get('current_club')?.toString() || null,
			division: data.get('division')?.toString() || null,
			email: (data.get('email')?.toString() ?? '').trim().toLowerCase(),
			phone: data.get('phone')?.toString() ?? '',
			instagram: cleanInstagram(data.get('instagram')?.toString())
		};

		if (isAcademie) {
			const settingsRes = await fetch(`${PUBLIC_DIRECTUS_URL}/items/RegistrationText`);
			const settings = await settingsRes.json().catch(() => null);
			if (!settings?.data?.academy_active) {
				const accepted = values.email ? await findAcceptedByEmail(values.email) : null;
				if (!accepted) {
					return fail(403, {
						error:
							"Les inscriptions à l'académie sont réservées pour le moment aux joueurs acceptés après le Talent Day. Utilise l'email avec lequel tu t'es inscrit(e).",
						values
					});
				}
			}
		}

		// Champs communs aux deux formulaires
		if (
			!values.first_name ||
			!values.last_name ||
			!values.birth_date ||
			!values.gender ||
			!values.preferred_position ||
			!values.email ||
			!values.phone
		) {
			return fail(400, { error: 'Merci de remplir tous les champs obligatoires.', values });
		}

		const emailConfirm = (data.get('email_confirm')?.toString() ?? '').trim().toLowerCase();
		if (values.email !== emailConfirm) {
			return fail(400, {
				error: 'Les deux adresses email ne correspondent pas. Vérifie ton email.',
				values
			});
		}

		if (!values.instagram) {
			return fail(400, {
				error: 'Indique ton compte Instagram, par exemple @brusselssummitacademy.',
				values
			});
		}

		// Champs obligatoires uniquement pour "Rejoindre l'académie"
		if (
			isAcademie &&
			(!values.birth_place || !values.nationality || !values.address || !values.postal_code)
		) {
			return fail(400, { error: 'Merci de remplir tous les champs obligatoires.', values });
		}

		const birthDate = new Date(values.birth_date);
		const today = new Date();
		let age = today.getFullYear() - birthDate.getFullYear();
		const hadBirthdayThisYear =
			today.getMonth() > birthDate.getMonth() ||
			(today.getMonth() === birthDate.getMonth() && today.getDate() >= birthDate.getDate());
		if (!hadBirthdayThisYear) age--;

		if (isNaN(birthDate.getTime()) || age < 16 || age > 28) {
			return fail(400, {
				error: 'Les inscriptions sont réservées aux 16-28 ans.',
				values
			});
		}

		// Joueur déjà accepté (Talent Day) qui complète sa fiche : on met à jour sa ligne existante
		const existing = isAcademie ? await findAcceptedByEmail(values.email) : null;
		const alreadyHasIds = !!(existing?.id_card_front && existing?.id_card_back);

		if (existing && alreadyHasIds) {
			try {
				await completeRegistration(existing, values);
			} catch (err) {
				console.error('Registration completion failed:', err);
				return fail(500, { error: 'Une erreur est survenue, réessaie plus tard.', values });
			}
			return { success: true };
		}

		const idFront = data.get('id_card_front');
		const idBack = data.get('id_card_back');
		if (
			!(idFront instanceof File) ||
			idFront.size === 0 ||
			!(idBack instanceof File) ||
			idBack.size === 0
		) {
			return fail(400, {
				error: "Le recto et le verso de ta carte d'identité sont obligatoires.",
				values
			});
		}

		const [frontCheck, backCheck] = await Promise.all([
			looksLikeIdDocument(idFront),
			looksLikeIdDocument(idBack)
		]);

		if (!frontCheck.valid) {
			return fail(400, { error: `Recto : ${frontCheck.reason}`, values });
		}
		if (!backCheck.valid) {
			return fail(400, { error: `Verso : ${backCheck.reason}`, values });
		}

		let idCardFrontId: string;
		let idCardBackId: string;

		try {
			// Les deux envois en parallèle (au lieu de l'un après l'autre)
			[idCardFrontId, idCardBackId] = await Promise.all([
				uploadFile(idFront, fetch),
				uploadFile(idBack, fetch)
			]);
		} catch {
			return fail(500, { error: "L'envoi de la carte d'identité a échoué, réessaie.", values });
		}

		// Joueur accepté mais sans carte d'identité enregistrée : on complète sa fiche avec les cartes
		if (existing) {
			try {
				await completeRegistration(existing, {
					...values,
					id_card_front: idCardFrontId,
					id_card_back: idCardBackId
				});
			} catch (err) {
				console.error('Registration completion failed:', err);
				return fail(500, { error: 'Une erreur est survenue, réessaie plus tard.', values });
			}
			return { success: true };
		}

		const res = await fetch(`${PUBLIC_DIRECTUS_URL}/items/Registration`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				...values,
				id_card_front: idCardFrontId,
				id_card_back: idCardBackId
			})
		});

		if (!res.ok) {
			const errorBody = await res.json().catch(() => null);
			console.error('Directus Registration insert failed:', res.status, JSON.stringify(errorBody));
			return fail(500, { error: 'Une erreur est survenue, réessaie plus tard.', values });
		}

		// Email de confirmation : envoyé en arrière-plan pour que le joueur n'attende pas.
		const sendConfirmation = async () => {
			let talentDayDate = '';
			if (values.type === 'talent_days') {
				try {
					const textRes = await fetch(`${PUBLIC_DIRECTUS_URL}/items/RegistrationText`);
					const { data: settings } = await textRes.json();
					talentDayDate = settings?.talent_day_date
						? new Intl.DateTimeFormat('fr-BE', {
								day: 'numeric',
								month: 'long',
								year: 'numeric'
							}).format(new Date(settings.talent_day_date))
						: '';
				} catch (err) {
					console.error('RegistrationText fetch failed:', err);
				}
			}

			let emailSent = false;
			let emailError = '';
			try {
				await sendRegistrationConfirmationEmail({
					to: values.email,
					firstName: values.first_name,
					type: values.type === 'talent_days' ? 'talent_days' : 'academie',
					talentDayDate: talentDayDate || undefined
				});
				emailSent = true;
			} catch (err) {
				emailError = err instanceof Error ? err.message : String(err);
				console.error('Confirmation email failed:', err);
			}

			// Trace dans Directus : le staff voit qui n'a pas reçu son email, et pourquoi.
			try {
				const auth = { Authorization: `Bearer ${env.DIRECTUS_SERVICE_TOKEN}` };
				// L'inscription est créée par le rôle Public (qui ne relit pas la ligne) :
				// on retrouve son identifiant avec le jeton du site.
				const findRes = await fetch(
					`${PUBLIC_DIRECTUS_URL}/items/Registration?filter[email][_eq]=${encodeURIComponent(values.email)}&sort=-id&limit=1&fields=id`,
					{ headers: auth }
				);
				const registrationId = findRes.ok ? (await findRes.json()).data?.[0]?.id : null;
				if (registrationId) {
					const patch = (body: Record<string, unknown>) =>
						fetch(`${PUBLIC_DIRECTUS_URL}/items/Registration/${registrationId}`, {
							method: 'PATCH',
							headers: { 'Content-Type': 'application/json', ...auth },
							body: JSON.stringify(body)
						});
					await patch({ email_envoye: emailSent });
					if (!emailSent) await patch({ email_erreur: emailError.slice(0, 500) });
				}
			} catch (err) {
				console.error('Registration email status update failed:', err);
			}
		};

		const task = sendConfirmation().catch((err) => console.error('sendConfirmation failed:', err));
		const p = platform as any;
		const waitUntil = p?.ctx?.waitUntil?.bind(p.ctx) ?? p?.context?.waitUntil?.bind(p.context);
		if (waitUntil) waitUntil(task);
		else await task;

		return { success: true };
	}
};
