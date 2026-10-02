import type { RequestHandler } from './$types';

const SITE_URL = 'https://brussels-summitacademy.be';

const pages = [
	{ path: '/', priority: '1.0', changefreq: 'weekly' },
	{ path: '/bio', priority: '0.6', changefreq: 'monthly' },
	{ path: '/inscription', priority: '0.9', changefreq: 'weekly' },
	{ path: '/mentions-legales', priority: '0.3', changefreq: 'yearly' },
	{ path: '/politique-de-confidentialite', priority: '0.3', changefreq: 'yearly' },
	{ path: '/cookies', priority: '0.3', changefreq: 'yearly' }
];

export const GET: RequestHandler = async () => {
	const lastmod = new Date().toISOString().split('T')[0];

	const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages
	.map(
		(p) => `	<url>
		<loc>${SITE_URL}${p.path}</loc>
		<lastmod>${lastmod}</lastmod>
		<changefreq>${p.changefreq}</changefreq>
		<priority>${p.priority}</priority>
	</url>`
	)
	.join('\n')}
</urlset>`;

	return new Response(body, {
		headers: { 'Content-Type': 'application/xml' }
	});
};
