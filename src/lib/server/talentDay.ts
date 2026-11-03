// Un Talent Day est considéré terminé dès le lendemain de sa date (heure de Bruxelles).
export function isPast(date?: string | null): boolean {
	if (!date) return false;
	const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Brussels' }).format(new Date());
	return String(date).slice(0, 10) < today;
}
