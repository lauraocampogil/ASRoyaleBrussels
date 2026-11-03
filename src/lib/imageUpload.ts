// Utilitaires navigateur pour les photos de carte d'identité.
export const MIN_DIMENSION = 600;
const MAX_SIDE = 1800;

// Convertit toute photo (dont HEIC d'iPhone) en JPEG léger : lisible par le serveur
// et beaucoup plus rapide à envoyer.
export async function toLightJpeg(file: File): Promise<File> {
	if (!file.type.startsWith('image/') && !/\.(heic|heif)$/i.test(file.name)) return file;

	let blob: Blob = file;
	const isHeic = /heic|heif/i.test(file.type) || /\.(heic|heif)$/i.test(file.name);
	if (isHeic) {
		try {
			// heic-to lit les HEIC récents des iPhone (l'ancienne lib heic2any échouait dessus)
			const { heicTo } = await import('heic-to');
			blob = await heicTo({ blob: file, type: 'image/jpeg', quality: 0.9 });
		} catch (err) {
			console.warn('Conversion HEIC impossible :', err);
			// Safari sait lire le HEIC nativement : on tente quand même avec le fichier d'origine.
		}
	}

	try {
		const bitmap = await createImageBitmap(blob);
		const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
		const canvas = document.createElement('canvas');
		canvas.width = Math.round(bitmap.width * scale);
		canvas.height = Math.round(bitmap.height * scale);
		canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
		const jpeg = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.85));
		if (jpeg) {
			return new File([jpeg], file.name.replace(/\.[^.]+$/, '') + '.jpg', {
				type: 'image/jpeg'
			});
		}
	} catch {
		// conversion impossible : on garde le fichier tel quel
	}
	return blob === file
		? file
		: new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' });
}
