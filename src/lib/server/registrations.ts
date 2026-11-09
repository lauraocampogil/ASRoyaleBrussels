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

// Les champs JSON (dossier, paiements, presences) peuvent avoir été créés comme « Text » dans Directus :
// on lit les deux formats.
export function parseJsonField<T = any>(value: unknown): T | null {
	if (typeof value === 'string') {
		try {
			return JSON.parse(value) as T;
		} catch {
			return null;
		}
	}
	return (value ?? null) as T | null;
}

const JSON_FIELDS = ['dossier', 'paiements', 'presences'];

// PATCH d'une inscription. Si Directus refuse (400) parce qu'un champ JSON a été créé en « Text »,
// on réessaie en envoyant ces champs sous forme de texte JSON. L'erreur est toujours journalisée.
export async function patchRegistration(id: string | number, body: Record<string, any>) {
	const url = `${PUBLIC_DIRECTUS_URL}/items/Registration/${id}`;
	const send = (b: Record<string, any>) =>
		fetch(url, { method: 'PATCH', headers: headers(), body: JSON.stringify(b) });

	let res = await send(body);
	if (res.status === 400 && JSON_FIELDS.some((f) => f in body)) {
		const asText = Object.fromEntries(
			Object.entries(body).map(([k, v]) => [
				k,
				JSON_FIELDS.includes(k) && typeof v === 'object' ? JSON.stringify(v) : v
			])
		);
		res = await send(asText);
	}
	if (!res.ok) {
		console.error('Registration PATCH failed:', res.status, await res.clone().text().catch(() => ''));
	}
	return res;
}

// Ne remplit que les champs encore vides : on n'écrase jamais une donnée existante.
export async function completeRegistration(
	existing: Record<string, any>,
	payload: Record<string, any>,
	overwrite: string[] = []
) {
	const patch: Record<string, any> = {};
	for (const [k, v] of Object.entries(payload)) {
		if (['id', 'status', 'type', 'email'].includes(k)) continue;
		if (v === null || v === undefined || v === '') continue;
		const cur = existing[k];
		// « Vide » : null, texte vide, objet ou liste vides (ex. valeur par défaut `{}` d'un champ JSON).
		const empty =
			cur === null ||
			cur === undefined ||
			cur === '' ||
			(Array.isArray(cur) && cur.length === 0) ||
			(typeof cur === 'object' && Object.keys(cur).length === 0) ||
			(typeof cur === 'string' && ['{}', '[]', 'null'].includes(cur.trim()));
		// Les champs listés dans « overwrite » (ex. nouvelle carte d'identité) remplacent l'ancienne valeur.
		if (empty || overwrite.includes(k)) patch[k] = v;
	}
	if (Object.keys(patch).length === 0) return;
	const res = await patchRegistration(existing.id, patch);
	if (!res.ok) {
		const detail = (await res.clone().text().catch(() => '')).slice(0, 300);
		throw new Error(`Directus ${res.status} ${detail}`);
	}
}
