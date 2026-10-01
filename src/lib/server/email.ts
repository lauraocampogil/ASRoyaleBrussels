import { Resend } from 'resend';
import { env } from '$env/dynamic/private';

let resendClient: Resend | null = null;

function getResend(): Resend {
	if (!resendClient) {
		resendClient = new Resend(env.RESEND_API_KEY);
	}
	return resendClient;
}

export async function sendRegistrationConfirmationEmail(opts: {
	to: string;
	firstName: string;
	type: 'talent_days' | 'academie';
}) {
	const subject =
		opts.type === 'talent_days'
			? 'Confirmation de ton inscription au Talent Day'
			: "Confirmation de ton inscription à l'académie";

	await getResend().emails.send({
		from: env.RESEND_FROM as string,
		to: opts.to,
		subject,
		html: `
			<div style="font-family: sans-serif; line-height:1.6;">
				<h2>Salut ${opts.firstName},</h2>
				<p>Nous avons bien reçu ton inscription${opts.type === 'talent_days' ? ' au Talent Day' : " pour rejoindre l'académie"}.</p>
				<p>Notre équipe va examiner ton dossier et reviendra vers toi rapidement.</p>
				<p>À bientôt,<br/>L'équipe Brussels Summit Academy</p>
			</div>
		`
	});
}

export async function sendAcceptanceEmail(opts: { to: string; firstName: string }) {
	await getResend().emails.send({
		from: env.RESEND_FROM as string,
		to: opts.to,
		subject: "Félicitations, tu es accepté(e) dans l'académie !",
		html: `
			<div style="font-family: sans-serif; line-height:1.6;">
				<h2>Bravo ${opts.firstName} !</h2>
				<p>Nous avons le plaisir de t'informer que ta candidature a été acceptée. Bienvenue dans l'académie Brussels Summit !</p>
				<p>Nous reviendrons vers toi prochainement avec les prochaines étapes.</p>
				<p>À très vite,<br/>L'équipe Brussels Summit Academy</p>
			</div>
		`
	});
}

export async function sendTalentDayReminderEmail(opts: {
	to: string;
	firstName: string;
	date: string;
}) {
	await getResend().emails.send({
		from: env.RESEND_FROM as string,
		to: opts.to,
		subject: "Rappel : le Talent Day, c'est demain !",
		html: `
			<div style="font-family: sans-serif; line-height:1.6;">
				<h2>Salut ${opts.firstName},</h2>
				<p>Petit rappel : le Talent Day a lieu demain, le ${opts.date}. On a hâte de te voir !</p>
				<p>À demain,<br/>L'équipe Brussels Summit Academy</p>
			</div>
		`
	});
}

export async function sendRejectionEmail(opts: { to: string; firstName: string }) {
	await getResend().emails.send({
		from: env.RESEND_FROM as string,
		to: opts.to,
		subject: 'Réponse à ta candidature — Brussels Summit Academy',
		html: `
			<div style="font-family: sans-serif; line-height:1.6;">
				<h2>Bonjour ${opts.firstName},</h2>
				<p>Nous te remercions pour ta candidature et l'intérêt porté à Brussels Summit Academy.</p>
				<p>Malheureusement, nous ne sommes pas en mesure de donner une suite favorable à ta candidature pour le moment.</p>
				<p>Nous t'encourageons à retenter ta chance lors d'une prochaine session.</p>
				<p>Cordialement,<br/>L'équipe Brussels Summit Academy</p>
			</div>
		`
	});
}
