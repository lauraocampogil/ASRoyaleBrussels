import { fail } from '@sveltejs/kit';
import { PUBLIC_DIRECTUS_URL } from '$env/static/public';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch }) => {
	const res = await fetch(`${PUBLIC_DIRECTUS_URL}/items/RegistrationText`);
	const { data } = await res.json();

	return {
		eyebrow: data?.eyebrow ?? '',
		title: data?.title ?? ''
	};
};

export const actions: Actions = {
	default: async ({ request }) => {
		const data = await request.formData();

		const values = {
			type: data.get('type')?.toString() ?? '',
			first_name: data.get('first_name')?.toString() ?? '',
			last_name: data.get('last_name')?.toString() ?? '',
			birth_date: data.get('birth_date')?.toString() ?? '',
			preferred_position: data.get('preferred_position')?.toString() ?? '',
			email: data.get('email')?.toString() ?? '',
			phone: data.get('phone')?.toString() ?? '',
			message: data.get('message')?.toString() || null
		};

		if (
			!values.first_name ||
			!values.last_name ||
			!values.birth_date ||
			!values.preferred_position ||
			!values.email ||
			!values.phone
		) {
			return fail(400, { error: 'Merci de remplir tous les champs obligatoires.', values });
		}

		let highlightVideoId: string | null = null;
		const videoFile = data.get('highlight_video');

		if (videoFile instanceof File && videoFile.size > 0) {
			const uploadForm = new FormData();
			uploadForm.append('file', videoFile, videoFile.name);

			const uploadRes = await fetch(`${PUBLIC_DIRECTUS_URL}/files`, {
				method: 'POST',
				body: uploadForm
			});

			if (!uploadRes.ok) {
				return fail(500, { error: "L'envoi de la vidéo a échoué, réessaie.", values });
			}

			const uploaded = await uploadRes.json();
			highlightVideoId = uploaded.data.id;
		}

		const res = await fetch(`${PUBLIC_DIRECTUS_URL}/items/Registration`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ ...values, highlight_video: highlightVideoId })
		});

		if (!res.ok) {
			return fail(500, { error: 'Une erreur est survenue, réessaie plus tard.', values });
		}

		return { success: true };
	}
};
