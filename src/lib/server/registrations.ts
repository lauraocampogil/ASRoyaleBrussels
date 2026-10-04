import { env } from '$env/dynamic/private';
import { PUBLIC_DIRECTUS_URL } from '$env/static/public'; // utilise ta variable d'URL Directus

const headers = () => ({
	Authorization: `Bearer ${env.DIRECTUS_SERVICE_TOKEN}`,
	'Content-Type': 'application/json'
});

export async function findAcceptedByEmail(email: string) {
	const wanted = email.trim().toLowerCase();
	const url = `${PUBLIC_DIRECTUS_URL}/items/Registration?filter[email][_icontains]=${encodeURIComponent(wanted)}&filter[status][_eq]=accepted&limit=10`;
	const res = await fetch(url, { headers: headers() });
	if (!res.ok) return null;
	const { data } = await res.json();
	return data?.find((r: any) => r.email?.trim().toLowerCase() === wanted) ?? null;
}

// Ne remplit que les champs encore vides : on n'écrase jamais une donnée existante.
export async function completeRegistration(
	existing: Record<string, any>,
	payload: Record<string, any>
) {
	const patch: Record<string, any> = {};
	for (const [k, v] of Object.entries(payload)) {
		if (['id', 'status', 'type', 'email'].includes(k)) continue;
		const empty = existing[k] === null || existing[k] === undefined || existing[k] === '';
		if (empty && v !== null && v !== undefined && v !== '') patch[k] = v;
	}
	if (Object.keys(patch).length === 0) return;
	const res = await fetch(`${PUBLIC_DIRECTUS_URL}/items/Registration/${existing.id}`, {
		method: 'PATCH',
		headers: headers(),
		body: JSON.stringify(patch)
	});
	if (!res.ok) throw new Error(`Directus ${res.status}`);
}
