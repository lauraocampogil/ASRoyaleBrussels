// Règle d'archivage automatique des « pas venus ».
// Un joueur non accepté qui n'est pas venu passe en archive (historique) après NO_SHOW_DAYS jours :
// - Talent Day : 7 jours après la date de l'événement ;
// - Faire un essai : 7 jours après l'inscription ;
// - ancien inscrit Talent Day réinscrit via « Faire un essai » (même email) : tout de suite.
export const NO_SHOW_DAYS = 7;

type Ctx = { talentDayDate: string; talentDayPassed: boolean; essaiEmails: Set<string> };

export function isNoShow(p: any, talentDayPassed: boolean): boolean {
	if (p.status === 'accepted') return false;
	const isTalent = p.type === 'talent_days';
	return (
		p.venue === false ||
		(isTalent && talentDayPassed && (p.status ?? 'pending') === 'pending' && p.venue !== true)
	);
}

export function autoArchived(p: any, ctx: Ctx): boolean {
	if (!isNoShow(p, ctx.talentDayPassed)) return false;
	const isTalent = p.type === 'talent_days';
	if (isTalent && ctx.essaiEmails.has(String(p.email ?? '').toLowerCase())) return true;
	const ref = Date.parse(isTalent ? ctx.talentDayDate : String(p.date_created ?? ''));
	return !Number.isNaN(ref) && Date.now() - ref >= NO_SHOW_DAYS * 24 * 3600 * 1000;
}
