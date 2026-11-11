import { env } from '$env/dynamic/private';

// Envoie un message WhatsApp automatique aux membres du staff via CallMeBot (gratuit).
//
// Réglage : variable d'environnement WHATSAPP_STAFF (Cloudflare Pages + .env), au format
//   +32470000000:CLE_API_1,+32480000000:CLE_API_2
// Chaque membre active d'abord CallMeBot (voir https://www.callmebot.com/blog/free-api-whatsapp-messages/) :
// il ajoute le numéro du bot affiché sur cette page, lui envoie "I allow callmebot to send me messages"
// sur WhatsApp et reçoit sa clé. (Si le bot est « full », le numéro n'est pas affiché : réessayer plus tard.)
function getRecipients(): { phone: string; apikey: string }[] {
	return (env.WHATSAPP_STAFF ?? '')
		.split(',')
		.map((entry) => entry.trim())
		.filter(Boolean)
		.map((entry) => {
			const [phone, apikey] = entry.split(':').map((s) => s.trim());
			return { phone: phone?.replace(/[^\d+]/g, ''), apikey };
		})
		.filter((r) => r.phone && r.apikey);
}

export async function sendWhatsAppToStaff(text: string): Promise<void> {
	const recipients = getRecipients();
	if (recipients.length === 0) {
		console.warn('WhatsApp: WHATSAPP_STAFF non configuré, aucun message envoyé.');
		return;
	}

	for (const r of recipients) {
		try {
			const url =
				`https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(r.phone)}` +
				`&text=${encodeURIComponent(text)}&apikey=${encodeURIComponent(r.apikey)}`;
			const res = await fetch(url);
			if (!res.ok) console.error(`WhatsApp (${r.phone}) a répondu ${res.status}`, await res.text());
		} catch (err) {
			console.error(`WhatsApp (${r.phone}) a échoué:`, err);
		}
		await new Promise((resolve) => setTimeout(resolve, 800));
	}
}
