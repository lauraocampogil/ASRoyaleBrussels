import directus, { readSingleton, assetUrl } from '$lib/directus';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const [header, footer, bio] = await Promise.all([
		directus.request(readSingleton('Header')),
		directus.request(readSingleton('Footer')),
		directus.request(readSingleton('Bio'))
	]);

	return {
		header: { ...header, logo: assetUrl(header.logo) },
		footer: { ...footer, logo: assetUrl(footer.logo) },
		eyebrow: bio?.eyebrow ?? '',
		title: bio?.title ?? '',
		content: bio?.content ?? '',
		closingLine: bio?.closing_line ?? '',
		image1: bio?.image_1 ? assetUrl(bio.image_1) : '',
		image2: bio?.image_2 ? assetUrl(bio.image_2) : '',
		image3: bio?.image_3 ? assetUrl(bio.image_3) : ''
	};
};
