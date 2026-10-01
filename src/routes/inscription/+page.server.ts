import { fail } from '@sveltejs/kit';
import { PUBLIC_DIRECTUS_URL } from '$env/static/public';
import type { Actions, PageServerLoad } from './$types';
import { sendRegistrationConfirmationEmail } from '$lib/server/email';

export const load: PageServerLoad = async ({ fetch }) => {
	const res = await fetch(`${PUBLIC_DIRECTUS_URL}/items/RegistrationText`);
	const { data } = await res.json();

	const talentDayActive = data?.talent_day_active ?? false;
	const talentDayDate = data?.talent_day_date
		? new Intl.DateTimeFormat('fr-BE', {
				day: 'numeric',
				month: 'long',
				year: 'numeric'
			}).format(new Date(data.talent_day_date))
		: '';

	return {
		eyebrow: data?.eyebrow ?? '',
		title: data?.title ?? '',
		logo: data?.logo
			? `${PUBLIC_DIRECTUS_URL}/assets/${data.logo}?width=160&quality=80&format=webp`
			: '',
		talentDayActive,
		talentDayDate
	};
};

async function uploadFile(file: File, fetchFn: typeof fetch): Promise<string> {
	const arrayBuffer = await file.arrayBuffer();
	const fileBlob = new Blob([arrayBuffer], { type: file.type });

	const uploadForm = new FormData();
	uploadForm.append('file', fileBlob, file.name);

	const uploadRes = await fetchFn(`${PUBLIC_DIRECTUS_URL}/files`, {
		method: 'POST',
		body: uploadForm
	});

	if (!uploadRes.ok) {
		const errorBody = await uploadRes.json().catch(() => null);
		console.error('Directus file upload failed:', uploadRes.status, JSON.stringify(errorBody));
		throw new Error('upload_failed');
	}

	const uploaded = await uploadRes.json();
	return uploaded.data.id;
}

export const actions: Actions = {
	default: async ({ request, fetch }) => {
		const data = await request.formData();

		const values = {
			type: data.get('type')?.toString() ?? '',
			first_name: data.get('first_name')?.toString() ?? '',
			last_name: data.get('last_name')?.toString() ?? '',
			birth_date: data.get('birth_date')?.toString() ?? '',
			gender: data.get('gender')?.toString() ?? '',
			preferred_position: data.get('preferred_position')?.toString() ?? '',
			current_club: data.get('current_club')?.toString() || null,
			division: data.get('division')?.toString() || null,
			email: data.get('email')?.toString() ?? '',
			phone: data.get('phone')?.toString() ?? '',
			message: data.get('message')?.toString() || null
		};

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

		const birthDate = new Date(values.birth_date);
		const today = new Date();
		let age = today.getFullYear() - birthDate.getFullYear();
		const hadBirthdayThisYear =
			today.getMonth() > birthDate.getMonth() ||
			(today.getMonth() === birthDate.getMonth() && today.getDate() >= birthDate.getDate());
		if (!hadBirthdayThisYear) age--;

		if (isNaN(birthDate.getTime()) || age < 16) {
			return fail(400, { error: "Tu dois avoir au moins 16 ans pour t'inscrire.", values });
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

		let idCardFrontId: string;
		let idCardBackId: string;

		try {
			idCardFrontId = await uploadFile(idFront, fetch);
			idCardBackId = await uploadFile(idBack, fetch);
		} catch {
			return fail(500, { error: "L'envoi de la carte d'identité a échoué, réessaie.", values });
		}

		let highlightVideoId: string | null = null;
		const videoFile = data.get('highlight_video');

		if (videoFile instanceof File && videoFile.size > 0) {
			try {
				highlightVideoId = await uploadFile(videoFile, fetch);
			} catch {
				return fail(500, { error: "L'envoi de la vidéo a échoué, réessaie.", values });
			}
		}

		const res = await fetch(`${PUBLIC_DIRECTUS_URL}/items/Registration`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				...values,
				highlight_video: highlightVideoId,
				id_card_front: idCardFrontId,
				id_card_back: idCardBackId
			})
		});

		if (!res.ok) {
			const errorBody = await res.json().catch(() => null);
			console.error('Directus Registration insert failed:', res.status, JSON.stringify(errorBody));
			return fail(500, { error: 'Une erreur est survenue, réessaie plus tard.', values });
		}

		const emailType = values.type === 'talent_days' ? 'talent_days' : 'academie';
		try {
			await sendRegistrationConfirmationEmail({
				to: values.email,
				firstName: values.first_name,
				type: emailType
			});
		} catch (err) {
			console.error('Confirmation email failed:', err);
		}

		return { success: true };
	}
};
