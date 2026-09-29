import { PUBLIC_DIRECTUS_URL } from '$env/static/public';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ fetch }) => {
	const res = await fetch(`${PUBLIC_DIRECTUS_URL}/items/TalentDayPopup`);
	const { data } = await res.json();

	const formattedDate = data?.date
		? new Intl.DateTimeFormat('fr-BE', {
				day: 'numeric',
				month: 'long',
				year: 'numeric'
			}).format(new Date(data.date))
		: '';

	return {
		talentDayPopup: {
			active: data?.active ?? false,
			date: formattedDate,
			title: data?.title ?? '',
			message: data?.message ?? '',
			ctaLabel: data?.cta_label ?? "Je m'inscris",
			ctaHref: data?.cta_href ?? '/inscription'
		}
	};
};
