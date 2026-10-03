import { env } from '$env/dynamic/private';

function arrayBufferToBase64(buffer: ArrayBuffer): string {
	let binary = '';
	const bytes = new Uint8Array(buffer);
	const chunkSize = 0x8000;
	for (let i = 0; i < bytes.length; i += chunkSize) {
		binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
	}
	return btoa(binary);
}

const MIN_TEXT_LENGTH = 15;

// Zone MRZ (Machine Readable Zone) : présente sur la quasi-totalité des passeports
// et cartes d'identité modernes, sous forme de lignes "P<BEL..." ou "ID<BEL...<<<<<<"
const MRZ_PATTERN = /[A-Z0-9<]{2,}<{3,}[A-Z0-9<]*/;

// Termes typiques d'une carte d'identité ou d'un passeport, dans plusieurs langues,
// pour ne pas bloquer les documents non-belges.
const ID_KEYWORDS = [
	// Français
	"carte d'identite",
	'carte identite',
	'passeport',
	'nationalite',
	'date de naissance',
	// Néerlandais
	'identiteitskaart',
	'paspoort',
	'nationaliteit',
	'geboortedatum',
	// Allemand
	'personalausweis',
	'reisepass',
	'staatsangehorigkeit',
	// Anglais
	'identity card',
	'passport',
	'nationality',
	'date of birth',
	'surname',
	'given name',
	// Noms de pays fréquents sur les documents
	'royaume de belgique',
	'koninkrijk belgie',
	'kingdom of belgium',
	'republique',
	'republic'
];

function normalize(text: string): string {
	return text
		.toLowerCase()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, ''); // retire les accents pour matcher plus largement
}

export async function looksLikeIdDocument(
	file: File
): Promise<{ valid: boolean; reason?: string }> {
	if (!file.type.startsWith('image/')) {
		return { valid: true };
	}

	try {
		const arrayBuffer = await file.arrayBuffer();
		const base64 = arrayBufferToBase64(arrayBuffer);

		const res = await fetch(
			`https://vision.googleapis.com/v1/images:annotate?key=${env.GOOGLE_VISION_API_KEY}`,
			{
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					requests: [
						{
							image: { content: base64 },
							features: [{ type: 'TEXT_DETECTION' }]
						}
					]
				})
			}
		);

		if (!res.ok) {
			console.error('Vision API error:', res.status, await res.text().catch(() => ''));
			return { valid: true };
		}

		const data = await res.json();
		const rawText: string = data?.responses?.[0]?.fullTextAnnotation?.text ?? '';
		const trimmed = rawText.trim();

		if (trimmed.length < MIN_TEXT_LENGTH) {
			return {
				valid: false,
				reason: 'Cette image ne semble pas être un document lisible. Vérifie la photo et réessaie.'
			};
		}

		const normalized = normalize(trimmed);
		const hasKeyword = ID_KEYWORDS.some((keyword) => normalized.includes(keyword));
		const hasMrz = MRZ_PATTERN.test(trimmed.toUpperCase());

		if (!hasKeyword && !hasMrz) {
			return {
				valid: false,
				reason:
					"Cette image ne ressemble pas à une carte d'identité ou un passeport. Vérifie la photo et réessaie."
			};
		}

		return { valid: true };
	} catch (err) {
		console.error('ID verification failed:', err);
		return { valid: true };
	}
}
