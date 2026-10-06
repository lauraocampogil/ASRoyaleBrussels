import { Resend } from 'resend';
import { env } from '$env/dynamic/private';

let resendClient: Resend | null = null;

function getResend(): Resend {
	if (!resendClient) {
		resendClient = new Resend(env.RESEND_API_KEY);
	}
	return resendClient;
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
					Rue de Ransbeek 227, 1020 Bruxelles &middot; +32 491 32 89 86<br/>
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
					<td style="padding:4px 0; font-weight:600;">15h00 — 18h45</td>
				</tr>
				<tr>
					<td style="padding:4px 0; color:#555;">Lieu</td>
					<td style="padding:4px 0; font-weight:600;">Centre Nelson Mandela<br/>Rue de Ransbeek 227, 1020 Bruxelles</td>
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
		await getResend().emails.send({
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
	await getResend().emails.send({
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
			<a href="https://brussels-summitacademy.be/inscription?type=academie" style="color:#1807b9; font-weight:600;">« Rejoindre l'académie »</a>,
			afin que nous puissions procéder à ton inscription définitive à l'académie.
		</p>
		<p style="margin-top:24px;">À très vite,<br/>L'équipe Brussels Summit Academy</p>
	`;
	await getResend().emails.send({
		from: env.RESEND_FROM as string,
		to: opts.to,
		subject: "Félicitations, tu es accepté(e) dans l'académie !",
		html: wrapEmail(content)
	});
}

export async function sendTalentDayReminderEmail(opts: {
	to: string;
	firstName: string;
	date: string;
}) {
	const content = `
		<h2 style="margin:0 0 16px; font-size:20px; color:#1807b9;">Salut ${opts.firstName},</h2>
		<p>Petit rappel : le Talent Day a lieu <strong>demain, le ${opts.date}</strong>, de 15h30 à 18h45 au Centre Nelson Mandela (Rue de Ransbeek 227, 1020 Bruxelles).</p>
		<p>N'oublie pas ta tenue de sport, tes crampons, ta carte d'identité originale et une bouteille d'eau.</p>
		<p style="margin-top:24px;">À demain,<br/>L'équipe Brussels Summit Academy</p>
	`;
	await getResend().emails.send({
		from: env.RESEND_FROM as string,
		to: opts.to,
		subject: `Rappel : Talent Day demain, ${opts.date}`,
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
	await getResend().emails.send({
		from: env.RESEND_FROM as string,
		to: opts.to,
		subject: 'Réponse à ta candidature — Brussels Summit Academy',
		html: wrapEmail(content)
	});
}
