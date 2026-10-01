import { redirect } from '@sveltejs/kit';
import { verifySessionCookie } from '$lib/server/session';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ cookies }) => {
	const email = await verifySessionCookie(cookies.get('staff_session'));
	if (!email) {
		throw redirect(303, '/admin/login');
	}
	return { staffEmail: email };
};
