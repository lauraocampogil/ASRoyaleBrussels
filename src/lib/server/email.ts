import { Resend } from 'resend';
import { env } from '$env/dynamic/private';

let resendClient: Resend | null = null;

function getResend(): Resend {
	if (!resendClient) {
		resendClient = new Resend(env.RESEND_API_KEY);
	}
	return resendClient;
}

// Resend ne lève pas d'exception en cas de refus : il renvoie { error }.
// Ce helper transforme cette erreur en vraie exception pour qu'elle soit visible.
async function send(opts: { from: string; to: string; subject: string; html: string }) {
	const { error } = await getResend().emails.send(opts);
	if (error) throw new Error(`${error.name}: ${error.message}`);
}

const SITE_URL = 'https://brussels-summitacademy.be';
const LOGO_URL = `${SITE_URL}/assets/images/logo-email.png`;

function wrapEmail(content: string): string {
	return `
	<div style="font-family: 'Helvetica Neue', Arial, sans-serif; background-color:#f4f5f7; padding:32px 16px;">
		<div style="max-width:520px; margin:0 auto; background-color:#ffffff; border-radius:16px; overflow:hidden; border:1px solid #e5e5ef;">
			<div style="background-color:#1807b9; padding:28px; text-align:center;">
				<img src="${LOGO_URL}" alt="Brussels Summit Academy" width="64" height="64" style="display:block; margin:0 auto 12px; border-radius:12px;" />
				<p style="margin:0; color:#ffffff; font-size:13px; letter-spacing:1px; text-transform:uppercase; font-weight:600;">Brussels Summit Academy</p>
			</div>
			<div style="padding:32px; color:#1a1a1a; line-height:1.6; font-size:15px;">
				${content}
			</div>
			<div style="padding:24px 32px; background-color:#f4f5f7; text-align:center; border-top:1px solid #e5e5ef;">
				<p style="margin:0 0 8px; font-size:13px; color:#555;">L'équipe Brussels Summit Academy</p>
				<p style="margin:0 0 12px; font-size:12px; color:#888;">
					Rue de Ransbeek 227, 1120 Bruxelles &middot; +32 491 32 89 86<br/>
					<a href="mailto:brussels@summitacademy-info.com" style="color:#1807b9; text-decoration:none;">brussels@summitacademy-info.com</a>
				</p>
				<p style="margin:0; font-size:12px;">
					<a href="https://www.instagram.com/brusselssummitacademy/" style="color:#1807b9; text-decoration:none; margin:0 6px;">Instagram</a>
					&middot;
					<a href="https://www.facebook.com/profile.php?id=61593354967029" style="color:#1807b9; text-decoration:none; margin:0 6px;">Facebook</a>
					&middot;
					<a href="https://www.tiktok.com/@brussels.summit.academy" style="color:#1807b9; text-decoration:none; margin:0 6px;">TikTok</a>
				</p>
			</div>
		</div>
	</div>`;
}

export async function sendRegistrationConfirmationEmail(opts: {
	to: string;
	firstName: string;
	type: 'talent_days' | 'academie';
	talentDayDate?: string;
}) {
	if (opts.type === 'talent_days') {
		const subject = 'Ton inscription au Talent Day est confirmée — infos pratiques';
		const content = `
			<h2 style="margin:0 0 16px; font-size:20px; color:#1807b9;">Salut ${opts.firstName},</h2>
			<p>Merci pour ton inscription au Talent Day Brussels Summit Academy! Ta candidature a bien été enregistrée, nous avons hâte de te voir sur le terrain.</p>
			<p style="margin:24px 0 8px; font-weight:600;">Rendez-vous :</p>
			<table style="width:100%; border-collapse:collapse; margin-bottom:20px;">
				<tr>
					<td style="padding:4px 0; color:#555; width:90px;">Date</td>
					<td style="padding:4px 0; font-weight:600;">${opts.talentDayDate ?? 'communiquée prochainement'}</td>
				</tr>
				<tr>
					<td style="padding:4px 0; color:#555;">Horaire</td>
					<td style="padding:4px 0; font-weight:600;">15h25 — 18h45</td>
				</tr>
				<tr>
					<td style="padding:4px 0; color:#555;">Lieu</td>
					<td style="padding:4px 0; font-weight:600;">Centre Nelson Mandela<br/>Rue de Ransbeek 227, 1120 Bruxelles</td>
				</tr>
			</table>
			<p style="margin:0 0 8px; font-weight:600;">À apporter le jour J :</p>
			<ul style="margin:0 0 20px; padding-left:20px; color:#333;">
				<li>Tenue de sport complète + crampons</li>
				<li>Ta carte d'identité originale (en plus du scan déjà envoyé)</li>
				<li>Une bouteille d'eau</li>
			</ul>
			<p>Si tu as la moindre question avant le jour J, n'hésite pas à nous écrire directement au email: brussels@summitacademy-info.com.</p>

			<p style="margin-top:24px;">À très vite,<br/>L'équipe Brussels Summit Academy</p>
		`;
		await send({
			from: env.RESEND_FROM as string,
			to: opts.to,
			subject,
			html: wrapEmail(content)
		});
		return;
	}

	const subject = "Confirmation de ta demande d'inscription à l'académie";
	const content = `
		<h2 style="margin:0 0 16px; font-size:20px; color:#1807b9;">Salut ${opts.firstName},</h2>
		<p>Nous avons bien reçu ta demande pour rejoindre Brussels Summit Academy. Merci pour ta confiance !</p>
		<p>Notre équipe va examiner ton dossier avec attention et reviendra vers toi rapidement avec une réponse.</p>
		<p style="margin-top:24px;">À bientôt,<br/>L'équipe Brussels Summit Academy</p>
	`;
	await send({
		from: env.RESEND_FROM as string,
		to: opts.to,
		subject,
		html: wrapEmail(content)
	});
}

export async function sendAcceptanceEmail(opts: { to: string; firstName: string }) {
	const content = `
		<h2 style="margin:0 0 16px; font-size:20px; color:#1807b9;">Bravo ${opts.firstName} !</h2>
		<p>Nous avons le plaisir de t'informer que ta candidature a été acceptée. Bienvenue dans l'académie Brussels Summit !</p>
		<p>Nous reviendrons vers toi très prochainement avec les prochaines étapes pour démarrer ton parcours avec nous.</p>
		<p>Pour l'instant, tu peux déjà compléter ta fiche via le lien
			<a href="https://brussels-summitacademy.be/inscription?type=academie&acces=accepte" style="color:#1807b9; font-weight:600;">« Rejoindre l'académie »</a>,
			afin que nous puissions procéder à ton inscription définitive à l'académie.
		</p>
		<p style="margin-top:24px;">À très vite,<br/>L'équipe Brussels Summit Academy</p>
	`;
	await send({
		from: env.RESEND_FROM as string,
		to: opts.to,
		subject: "Félicitations, tu es accepté(e) dans l'académie !",
		html: wrapEmail(content)
	});
}

export async function sendCorrectionEmail(opts: { to: string; firstName: string }) {
	const content = `
		<h2 style="margin:0 0 16px; font-size:20px; color:#1807b9;">Bonjour ${opts.firstName},</h2>
		<p>Tu as reçu récemment un email t'annonçant ton acceptation à l'académie. Cet email a été envoyé par erreur, et nous nous en excusons.</p>
		<p>Ta candidature est toujours en cours d'examen.</p>
		<p>Tu es donc attendu au Talent Day du dimanche 1er novembre, de 15h25 à 18h45 (Rue de Ransbeek 227, 1120 Bruxelles). L'inscription est gratuite.</p>
		<p style="margin-top:24px;">Merci de ta compréhension,<br/>L'équipe Brussels Summit Academy</p>
	`;
	await send({
		from: env.RESEND_FROM as string,
		to: opts.to,
		subject: 'Correction: ta candidature à Brussels Summit Academy',
		html: wrapEmail(content)
	});
}

export async function sendTalentDayReminderEmail(opts: {
	to: string;
	firstName: string;
	date: string;
	when?: 'demain' | "aujourd'hui";
}) {
	const when = opts.when ?? 'demain';
	const content = `
		<h2 style="margin:0 0 16px; font-size:20px; color:#1807b9;">Salut ${opts.firstName},</h2>
		<p>Petit rappel : le Talent Day a lieu <strong>${when}, le ${opts.date}</strong>, de 15h25 à 18h45 au Centre Nelson Mandela (Rue de Ransbeek 227, 1120 Bruxelles).</p>
		<p>N'oublie pas ta tenue de sport, tes crampons, ta carte d'identité originale et une bouteille d'eau.</p>
		<p style="margin-top:24px;">${when === 'demain' ? 'À demain' : 'À tout à l\'heure'},<br/>L'équipe Brussels Summit Academy</p>
	`;
	await send({
		from: env.RESEND_FROM as string,
		to: opts.to,
		subject: `Rappel : Talent Day ${when}, ${opts.date}`,
		html: wrapEmail(content)
	});
}

export async function sendRejectionEmail(opts: { to: string; firstName: string }) {
	const content = `
		<h2 style="margin:0 0 16px; font-size:20px; color:#1807b9;">Bonjour ${opts.firstName},</h2>
		<p>Nous te remercions pour ta candidature et l'intérêt porté à Brussels Summit Academy.</p>
		<p>Malheureusement, nous ne sommes pas en mesure de donner une suite favorable à ta candidature pour le moment.</p>
		<p>Nous t'encourageons à retenter ta chance lors d'une prochaine session.</p>
		<p style="margin-top:24px;">Cordialement,<br/>L'équipe Brussels Summit Academy</p>
	`;
	await send({
		from: env.RESEND_FROM as string,
		to: opts.to,
		subject: 'Réponse à ta candidature — Brussels Summit Academy',
		html: wrapEmail(content)
	});
}

function escapeHtml(value: unknown): string {
	return String(value ?? '')
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

// Adresses des membres du staff (même variable que la connexion au dashboard : STAFF_ACCOUNTS).
export function getStaffEmails(): string[] {
	const raw = env.STAFF_ACCOUNTS ?? '';
	return raw
		.split(',')
		.map((pair) => pair.split(':')[0]?.trim().toLowerCase())
		.filter((email): email is string => !!email && email.includes('@'));
}

// Prévient chaque membre du staff qu'une inscription vient d'arriver.
export async function sendStaffNotificationEmail(opts: {
	kind: 'nouvelle' | 'completee';
	type: string;
	firstName: string;
	lastName: string;
	email: string;
	phone: string;
	instagram?: string | null;
	position?: string | null;
}) {
	const recipients = getStaffEmails();
	if (recipients.length === 0) return;

	const typeLabel = opts.type === 'talent_days' ? 'Talent Day' : "Rejoindre l'académie";
	const title =
		opts.kind === 'completee' ? 'Fiche académie complétée' : `Nouvelle inscription · ${typeLabel}`;
	const row = (label: string, value?: string | null) =>
		value
			? `<tr><td style="padding:4px 12px 4px 0; color:#555;">${label}</td><td style="padding:4px 0; font-weight:600;">${escapeHtml(value)}</td></tr>`
			: '';

	const content = `
		<h2 style="margin:0 0 16px; font-size:20px; color:#1807b9;">${escapeHtml(title)}</h2>
		<table style="border-collapse:collapse; font-size:15px;">
			${row('Nom', `${opts.firstName} ${opts.lastName}`)}
			${row('Formulaire', typeLabel)}
			${row('Email', opts.email)}
			${row('Téléphone', opts.phone)}
			${row('Instagram', opts.instagram ? `@${opts.instagram}` : '')}
			${row('Poste', opts.position)}
		</table>
		<p style="margin-top:24px;"><a href="${SITE_URL}/admin" style="background:#1807b9; color:#ffffff; padding:10px 18px; border-radius:999px; text-decoration:none; font-weight:600;">Ouvrir le dashboard</a></p>
	`;

	// Un email par personne, l'un après l'autre (limite de débit de Resend).
	for (const to of recipients) {
		try {
			await send({
				from: env.RESEND_FROM as string,
				to,
				subject: `${title} : ${opts.firstName} ${opts.lastName}`,
				html: wrapEmail(content)
			});
		} catch (err) {
			console.error(`Staff notification failed for ${to}:`, err);
		}
		await new Promise((r) => setTimeout(r, 600));
	}
}
