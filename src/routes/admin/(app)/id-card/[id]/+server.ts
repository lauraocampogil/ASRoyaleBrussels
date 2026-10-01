import { error } from '@sveltejs/kit';
import { PUBLIC_DIRECTUS_URL } from '$env/static/public';
import { env } from '$env/dynamic/private';
import { verifySessionCookie } from '$lib/server/session';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, cookies, fetch }) => {
	const email = await verifySessionCookie(cookies.get('staff_session'));
	if (!email) {
		throw error(401, 'Non autorisé');
	}

	const res = await fetch(`${PUBLIC_DIRECTUS_URL}/assets/${params.id}`, {
		headers: { Authorization: `Bearer ${env.DIRECTUS_SERVICE_TOKEN}` }
	});

	if (!res.ok) {
		throw error(res.status, 'Impossible de charger le fichier');
	}

	return new Response(res.body, {
		headers: {
			'Content-Type': res.headers.get('Content-Type') ?? 'application/octet-stream',
			'Cache-Control': 'private, max-age=0, no-store'
		}
	});
};
