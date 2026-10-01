import { env } from '$env/dynamic/private';

function toHex(buffer: ArrayBuffer): string {
	return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function sign(payload: string): Promise<string> {
	const key = await crypto.subtle.importKey(
		'raw',
		new TextEncoder().encode(env.ADMIN_SESSION_SECRET),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign']
	);
	const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
	return toHex(sig);
}

export async function createSessionCookie(email: string): Promise<string> {
	const expiresAt = Date.now() + 1000 * 60 * 60 * 24 * 7; // 7 jours
	const payload = `${email}:${expiresAt}`;
	const signature = await sign(payload);
	return `${payload}.${signature}`;
}

export async function verifySessionCookie(token: string | undefined): Promise<string | null> {
	if (!token) return null;

	const lastDotIndex = token.lastIndexOf('.');
	if (lastDotIndex === -1) return null;

	const payload = token.slice(0, lastDotIndex);
	const signature = token.slice(lastDotIndex + 1);
	if (!payload || !signature) return null;

	const expectedSignature = await sign(payload);
	if (expectedSignature !== signature) return null;

	const [email, expiresAtStr] = payload.split(':');
	const expiresAt = Number(expiresAtStr);
	if (!email || !expiresAt || Date.now() > expiresAt) return null;

	return email;
}
