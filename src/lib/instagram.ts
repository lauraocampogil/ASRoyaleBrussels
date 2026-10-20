// Accepte "@pseudo", "pseudo" ou un lien instagram.com/pseudo et renvoie le pseudo seul.
// Renvoie '' si le résultat n'est pas un pseudo Instagram valide.
export function cleanInstagram(value: string | null | undefined): string {
	const s = (value ?? '')
		.trim()
		.replace(/^https?:\/\/(www\.)?instagram\.com\//i, '')
		.replace(/^@/, '')
		.replace(/[/?#].*$/, '');
	return /^[A-Za-z0-9._]{1,30}$/.test(s) ? s : '';
}
