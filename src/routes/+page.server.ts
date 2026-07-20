import directus, { readItems, readSingleton, assetUrl } from '$lib/directus';

export async function load() {
	const [
		header,
		hero,
		marquee,
		method,
		parcours,
		parcoursSteps,
		playersSection,
		players,
		staffSection,
		staffMembers,
		CTA,
		registration,
		footer
	] = await Promise.all([
		directus.request(readSingleton('Header')),
		directus.request(readSingleton('Hero')),
		directus.request(readSingleton('Marquee')),
		directus.request(readSingleton('Method')),
		directus.request(readSingleton('Parcours')),
		directus.request(readItems('ParcoursSteps', { sort: ['order'] })),
		directus.request(readSingleton('PlayersSection')),
		directus.request(readItems('Players')),
		directus.request(readSingleton('Staff')),
		directus.request(readItems('StaffMembers')),
		directus.request(readSingleton('CTA')),
		directus.request(readSingleton('Registration')),
		directus.request(readSingleton('Footer'))
	]);

	const blocks = [
		{ type: 'HeaderBlock', props: { ...header, logo: assetUrl(header.logo) } },
		{ type: 'HeroBlock', props: { ...hero, background: assetUrl(hero.video_background) } },
		{ type: 'MarqueeBlock', props: marquee },
		{
			type: 'MethodBlock',
			props: {
				...method,
				image: assetUrl(method.image),
				image_subject: assetUrl(method.image_subject)
			}
		},
		{ type: 'ParcoursBlock', props: { ...parcours, steps: parcoursSteps } },
		{
			type: 'PlayersBlock',
			props: {
				eyebrow: playersSection.eyebrow,
				title: playersSection.title,
				description: playersSection.description,
				players: players.map((p: any) => ({
					id: p.id,
					name: p.name,
					position: p.position,
					country: p.country,
					country_code: p.country_code,
					club: p.club,
					club_logo: assetUrl(p.club_logo),
					instagram: p.instagram,
					email: p.email,
					photo: assetUrl(p.photo),
					highlight_video: assetUrl(p.highlight_video),
					gender: p.gender,
					goals: p.goals,
					assists: p.assists,
					games: p.games,
					foot: p.foot,
					height: p.height
				}))
			}
		},
		{
			type: 'StaffBlock',
			props: {
				eyebrow: staffSection.eyebrow,
				title: staffSection.title,
				description: staffSection.description,
				staff: staffMembers.map((s: any) => ({
					name: s.name,
					role: s.role,
					image: assetUrl(s.photo),
					image_subject: assetUrl(s.image_subject)
				}))
			}
		},
		{
			type: 'CTABlock',
			props: {
				title: CTA.title,
				cta_label: CTA.cta_label,
				cta_href: CTA.cta_href
			}
		},
		{ type: 'FooterBlock', props: { ...footer, logo: assetUrl(footer.logo) } }
	];

	return { blocks };
}
