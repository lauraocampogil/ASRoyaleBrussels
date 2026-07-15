import directus, { readItems } from '$lib/directus';

export async function load() {
	const staff = await directus.request(readItems('Staff'));
	return { staff };
}
