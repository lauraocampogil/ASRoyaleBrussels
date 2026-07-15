import { createDirectus, rest, readItems, readSingleton } from '@directus/sdk';
import { PUBLIC_DIRECTUS_URL } from '$env/static/public';

const directus = createDirectus(PUBLIC_DIRECTUS_URL).with(rest());

export const assetUrl = (id: string | null) => (id ? `${PUBLIC_DIRECTUS_URL}/assets/${id}` : null);

export default directus;
export { readItems, readSingleton };
