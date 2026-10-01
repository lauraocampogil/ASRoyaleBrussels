import { fail, redirect } from '@sveltejs/kit';
import { STAFF_ACCOUNTS } from '$env/static/private';
import { createSessionCookie } from '$lib/server/session';
import type { Actions } from './$types';

function parseAccounts(): Record<string, string> {
	const accounts: Record<string, string> = {};
	for (const pair of STAFF_ACCOUNTS.split(',')) {
		const [email, password] = pair.split(':');
		if (email && password) accounts[email.trim().toLowerCase()] = password.trim();
	}
	return accounts;
}

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const data = await request.formData();
		const email = String(data.get('email') ?? '').trim().toLowerCase();
		const password = String(data.get('password') ?? '').trim();

		const accounts = parseAccounts();

		if (!accounts[email] || accounts[email] !== password) {
			return fail(401, { error: 'Email ou mot de passe incorrect.' });
		}

		const token = await createSessionCookie(email);
		cookies.set('staff_session', token, {
			path: '/',
			httpOnly: true,
			secure: true,
			sameSite: 'lax',
			maxAge: 60 * 60 * 24 * 7
		});

		throw redirect(303, '/admin');
	}
};