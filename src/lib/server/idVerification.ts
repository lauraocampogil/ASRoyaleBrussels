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

export async function looksLikeIdDocument(
	file: File
): Promise<{ valid: boolean; reason?: string }> {
	// On ne vérifie que les images (les PDF passent sans ce contrôle,
	// Vision API ne traite pas les PDF via ce endpoint simple)
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
			// En cas d'erreur de l'API, on laisse passer plutôt que de bloquer
			// une vraie inscription à cause d'un souci technique externe.
			return { valid: true };
		}

		const data = await res.json();
		const detectedText: string = data?.responses?.[0]?.fullTextAnnotation?.text ?? '';

		if (detectedText.trim().length < MIN_TEXT_LENGTH) {
			return {
				valid: false,
				reason:
					"Cette image ne semble pas être un document lisible (carte d'identité). Vérifie la photo et réessaie."
			};
		}

		return { valid: true };
	} catch (err) {
		console.error('ID verification failed:', err);
		return { valid: true };
	}
}
