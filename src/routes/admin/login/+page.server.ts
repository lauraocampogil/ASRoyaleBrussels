import { fail, redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { createSessionCookie } from '$lib/server/session';
import type { Actions } from './$types';

function parseAccounts(): Record<string, string> {
	const accounts: Record<string, string> = {};
	const raw = env.STAFF_ACCOUNTS ?? '';
	for (const pair of raw.split(',')) {
		const [email, password] = pair.split(':');
		if (email && password) accounts[email.trim().toLowerCase()] = password.trim();
	}
	return accounts;
}

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const data = await request.formData();
		const email = String(data.get('email') ?? '')
			.trim()
			.toLowerCase();
		const password = String(data.get('password') ?? '').trim();

		const accounts = parseAccounts();
		console.log('Comptes staff reconnus:', Object.keys(accounts));

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
