import directus, { readSingleton, assetUrl } from '$lib/directus';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const [header, footer, bio] = await Promise.all([
		directus.request(readSingleton('Header')),
		directus.request(readSingleton('Footer')),
		directus.request(readSingleton('Bio'))
	]);

	return {
		header: { ...header, logo: assetUrl(header.logo, { width: 160 }) },
		footer: { ...footer, logo: assetUrl(footer.logo, { width: 160 }) },
		eyebrow: bio?.eyebrow ?? '',
		title: bio?.title ?? '',
		content: bio?.content ?? '',
		closingLine: bio?.closing_line ?? '',
		image1: bio?.image_1 ? assetUrl(bio.image_1, { width: 900 }) : '',
		image2: bio?.image_2 ? assetUrl(bio.image_2, { width: 900 }) : '',
		image3: bio?.image_3 ? assetUrl(bio.image_3, { width: 900 }) : ''
	};
};
