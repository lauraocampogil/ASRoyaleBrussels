import { createDirectus, rest, readItems, readSingleton } from '@directus/sdk';
import { PUBLIC_DIRECTUS_URL } from '$env/static/public';
import { env } from '$env/dynamic/private';

const directus = createDirectus(PUBLIC_DIRECTUS_URL).with(rest());

export const img = (id: string, w: number) =>
	`${PUBLIC_DIRECTUS_URL}/assets/${id}?width=${w}&quality=70&format=webp`;

export const srcset = (id: string, widths: number[]) =>
	widths.map((w) => `${img(id, w)} ${w}w`).join(', ');

interface AssetOptions {
	width?: number;
	height?: number;
	quality?: number;
	format?: 'webp' | 'avif' | 'jpg' | 'png';
}

export const assetUrl = (id: string | null, options: AssetOptions = {}) => {
	if (!id) return null;

	const { width, height, quality = 80, format = 'webp' } = options;
	const params = new URLSearchParams();

	if (width) params.set('width', String(width));
	if (height) params.set('height', String(height));
	params.set('quality', String(quality));
	params.set('format', format);

	return `${PUBLIC_DIRECTUS_URL}/assets/${id}?${params.toString()}`;
};

export async function cachedGet(url: string, ttl = 300) {
	const res = await fetch(url, {
		headers: { Authorization: `Bearer ${env.DIRECTUS_SERVICE_TOKEN}` }, // seulement si l'endpoint n'est pas public
		// @ts-expect-error option spécifique à Cloudflare Workers
		cf: { cacheTtl: ttl, cacheEverything: true }
	});
	if (!res.ok) throw new Error(`Directus ${res.status}`);
	return res.json();
}

export default directus;
export { readItems, readSingleton };
