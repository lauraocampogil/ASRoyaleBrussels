import { createDirectus, rest, readItems, readSingleton } from '@directus/sdk';
import { PUBLIC_DIRECTUS_URL } from '$env/static/public';

const directus = createDirectus(PUBLIC_DIRECTUS_URL).with(rest());

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

export default directus;
export { readItems, readSingleton };
