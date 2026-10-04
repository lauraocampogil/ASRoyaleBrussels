import { error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { PUBLIC_DIRECTUS_URL } from '$env/static/public'; // utilise le nom de ta variable d'URL Directus

export const GET = async ({ params, request }) => {
	const headers: Record<string, string> = {
		Authorization: `Bearer ${env.DIRECTUS_SERVICE_TOKEN}`
	};
	const range = request.headers.get('range');
	if (range) headers.Range = range;

	const upstream = await fetch(`${PUBLIC_DIRECTUS_URL}/assets/${params.id}`, { headers });
	if (!upstream.ok) throw error(404);

	// Sécurité : on ne sert que des vidéos (jamais les cartes d'identité)
	const type = upstream.headers.get('content-type') ?? '';
	if (!type.startsWith('video/')) throw error(404);

	const out = new Headers({
		'content-type': type,
		'accept-ranges': 'bytes',
		'cache-control': 'public, max-age=86400'
	});
	for (const h of ['content-length', 'content-range']) {
		const v = upstream.headers.get(h);
		if (v) out.set(h, v);
	}
	return new Response(upstream.body, { status: upstream.status, headers: out });
};
