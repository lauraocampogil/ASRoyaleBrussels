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
	gender?: string | null;
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

	const g = (opts.gender ?? '').trim();
	const isFemale = /^(f|fille|femme|female|woman|girl)$/i.test(g);
	const isMale = /^(m|garcon|garçon|homme|male|man|boy)$/i.test(g);
	const horaire = isFemale
		? `<strong>${MAKEUP.girls}</strong>`
		: isMale
			? `<strong>${MAKEUP.boys}</strong>`
			: `<strong>${MAKEUP.girls}</strong> pour les filles, <strong>${MAKEUP.boys}</strong> pour les garçons`;

	const subject = 'Ta demande pour faire un essai à Brussels Summit Academy';
	const content = `
		<h2 style="margin:0 0 16px; font-size:20px; color:#1807b9;">Salut ${opts.firstName},</h2>
		<p>Merci, tu es bien enregistré(e) pour <strong>faire un essai</strong> à Brussels Summit Academy !</p>
		<p>Un membre du staff va te contacter très bientôt pour te confirmer si on t'attend <strong>ce week-end ou le suivant</strong>.</p>
		<p style="margin:20px 0 8px; font-weight:600;">Nos entraînements :</p>
		<table style="width:100%; border-collapse:collapse; margin-bottom:20px;">
			<tr>
				<td style="padding:4px 0; color:#555; width:90px;">Horaire</td>
				<td style="padding:4px 0;">${horaire}</td>
			</tr>
			<tr>
				<td style="padding:4px 0; color:#555;">Lieu</td>
				<td style="padding:4px 0; font-weight:600;">Centre Nelson Mandela<br/>Rue de Ransbeek 227, 1120 Bruxelles</td>
			</tr>
		</table>
		<p style="margin-top:24px;">À très vite,<br/>L'équipe Brussels Summit Academy</p>
	`;
	await send({
		from: env.RESEND_FROM as string,
		to: opts.to,
		subject,
		html: wrapEmail(content)
	});
}

function buildAcceptanceEmail(opts: {
	to: string;
	firstName: string;
	gender?: string | null;
}) {
	const link = `${SITE_URL}/inscription?type=academie&acces=accepte`;
	const isFemale = /^(f|fille|femme|female|woman|girl)$/i.test((opts.gender ?? '').trim());
	const isMale = /^(m|garcon|garçon|homme|male|man|boy)$/i.test((opts.gender ?? '').trim());
	const monthly = isFemale ? '50' : isMale ? '80' : null;
	const horaire = isFemale
		? `<strong>${MAKEUP.girls}</strong>`
		: isMale
			? `<strong>${MAKEUP.boys}</strong>`
			: `<strong>${MAKEUP.girls}</strong> pour les filles, <strong>${MAKEUP.boys}</strong> pour les garçons`;

	const feeRows = `
		<tr>
			<td style="padding:6px 0; color:#555;">Cotisation annuelle</td>
			<td style="padding:6px 0; font-weight:600; text-align:right;">150 € <span style="font-weight:400; color:#555;">(une fois par an)</span></td>
		</tr>
		${
			monthly
				? `<tr>
			<td style="padding:6px 0; color:#555;">Cotisation mensuelle</td>
			<td style="padding:6px 0; font-weight:600; text-align:right;">${monthly} € <span style="font-weight:400; color:#555;">(par mois)</span></td>
		</tr>`
				: `<tr>
			<td style="padding:6px 0; color:#555;">Cotisation mensuelle</td>
			<td style="padding:6px 0; font-weight:600; text-align:right;">80 € (garçons) · 50 € (filles)</td>
		</tr>`
		}`;

	const content = `
		<h2 style="margin:0 0 16px; font-size:20px; color:#1807b9;">Félicitations ${opts.firstName} !</h2>
		<p>Nous avons le plaisir de t'annoncer que ta candidature a été <strong>acceptée</strong>. Bienvenue chez Brussels Summit Academy !</p>

		<p style="margin:24px 0 8px; font-weight:600;">On t'attend ce week-end !</p>
		<p style="margin:0 0 8px;">Tu es attendu(e) pour une première séance avec nous, <strong>${MAKEUP.dates}</strong> (au choix) :</p>
		<table style="width:100%; border-collapse:collapse; margin:0 0 20px;">
			<tr>
				<td style="padding:4px 0; color:#555; width:90px;">Horaire</td>
				<td style="padding:4px 0;">${horaire}</td>
			</tr>
			<tr>
				<td style="padding:4px 0; color:#555;">Lieu</td>
				<td style="padding:4px 0; font-weight:600;">Centre Nelson Mandela<br/>Rue de Ransbeek 227, 1120 Bruxelles</td>
			</tr>
		</table>
		<p style="margin:0 0 20px; font-size:14px; color:#333;">Pense à apporter ta tenue de sport complète, tes crampons, ta carte d'identité originale et une bouteille d'eau. Dis-nous quel jour tu viens en nous écrivant sur WhatsApp au ${WA_LINK}. Pour toute autre question, écris-nous sur WhatsApp ou par email à ${MAIL_LINK}.</p>

		<p style="margin:24px 0 8px; font-weight:600;">Pour finaliser ton inscription :</p>
		<ol style="margin:0 0 20px; padding-left:20px; color:#333;">
			<li style="margin-bottom:6px;">Remplis ton dossier de candidature en ligne (10 minutes environ). Il nous permet de te connaître, de préparer ton contrat d'adhésion et de contacter ta famille si besoin.</li>
			<li style="margin-bottom:6px;">Si tu es mineur·e, l'accord d'un parent ou responsable légal est nécessaire.</li>
			<li>Nous reviendrons ensuite vers toi pour ton contrat d'adhésion et les modalités de paiement.</li>
		</ol>

		<p style="margin:24px 0;">
			<a href="${link}" style="display:inline-block; background:#1807b9; color:#ffffff; padding:12px 24px; border-radius:999px; text-decoration:none; font-weight:600;">Compléter mon dossier</a>
		</p>

		<p style="margin:24px 0 8px; font-weight:600;">Cotisations :</p>
		<table style="width:100%; border-collapse:collapse; margin-bottom:8px; font-size:15px; border-top:1px solid #e5e5ef; border-bottom:1px solid #e5e5ef;">
			${feeRows}
		</table>
		<p style="font-size:13px; color:#555;">Les modalités de paiement te seront communiquées avec ton contrat d'adhésion.</p>

		<p>Une question ? Écris-nous sur WhatsApp au ${WA_LINK} ou par email à ${MAIL_LINK}.</p>
		<p style="margin-top:24px;">À très vite sur le terrain,<br/>L'équipe Brussels Summit Academy</p>
	`;
	return { subject: "Bienvenue chez Brussels Summit Academy : ta candidature est acceptée !", html: wrapEmail(content) };
}

export async function sendAcceptanceEmail(opts: {
	to: string;
	firstName: string;
	gender?: string | null;
}) {
	const { subject, html } = buildAcceptanceEmail(opts);
	await send({ from: env.RESEND_FROM as string, to: opts.to, subject, html });
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

	const typeLabel = opts.type === 'talent_days' ? 'Talent Day' : "Faire un essai";
	const title =
		opts.kind === 'completee' ? 'Dossier complété par un joueur accepté' : `Nouvelle inscription · ${typeLabel}`;
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

// ---- Rattrapage : email aux joueurs qui n'ont pas pu venir au Talent Day ----
// Modifie ces valeurs si les dates ou les horaires changent.
// Contact du staff (questions des joueurs). Le WhatsApp sert surtout à prévenir quel jour le joueur vient.
const WA_LINK = '<a href="https://wa.me/32491328986" style="color:#1807b9;">+32 491 32 89 86</a>';
const MAIL_LINK =
	'<a href="mailto:brussels@summitacademy-info.com" style="color:#1807b9;">brussels@summitacademy-info.com</a>';

// Prochain week-end (samedi + dimanche), calculé automatiquement à chaque envoi (heure de Bruxelles).
function nextWeekendLabel(): string {
	const parts = new Intl.DateTimeFormat('en-CA', {
		timeZone: 'Europe/Brussels',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit'
	})
		.format(new Date())
		.split('-')
		.map(Number);
	const today = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
	const dow = today.getUTCDay(); // 0 = dimanche … 6 = samedi
	// Samedi (ou aujourd'hui s'il est samedi) ; le dimanche passe au week-end suivant.
	const toSaturday = dow === 6 ? 0 : (6 - dow + 7) % 7;
	const sat = new Date(today);
	sat.setUTCDate(sat.getUTCDate() + toSaturday);
	const sun = new Date(sat);
	sun.setUTCDate(sun.getUTCDate() + 1);

	const fmt = (d: Date, withMonth: boolean) =>
		new Intl.DateTimeFormat('fr-BE', {
			timeZone: 'UTC',
			weekday: 'long',
			day: 'numeric',
			...(withMonth ? { month: 'long' } : {})
		}).format(d);
	const sameMonth = sat.getUTCMonth() === sun.getUTCMonth();
	return `${fmt(sat, !sameMonth)} ou ${fmt(sun, true)}`;
}

const MAKEUP = {
	get dates() {
		return nextWeekendLabel();
	},
	girls: 'de 17h00 à 18h30',
	boys: 'de 17h30 à 19h00'
};

export async function sendMakeupEmails(
	players: { to: string; firstName: string; gender?: string | null }[]
): Promise<void> {
	const emails = players.map((p) => {
		const g = (p.gender ?? '').trim();
		const isFemale = /^(f|fille|femme|female|woman|girl)$/i.test(g);
		const isMale = /^(m|garcon|garçon|homme|male|man|boy)$/i.test(g);
		const horaire = isFemale
			? `<strong>${MAKEUP.girls}</strong>`
			: isMale
				? `<strong>${MAKEUP.boys}</strong>`
				: `<strong>${MAKEUP.girls}</strong> pour les filles, <strong>${MAKEUP.boys}</strong> pour les garçons`;

		const content = `
			<h2 style="margin:0 0 16px; font-size:20px; color:#1807b9;">Salut ${p.firstName},</h2>
			<p>Nous n'avons pas pu te voir au Talent Day du 1er novembre, mais <strong>tu peux encore venir te tester</strong> : nous t'accueillons ce week-end !</p>
			<table style="width:100%; border-collapse:collapse; margin:20px 0;">
				<tr>
					<td style="padding:4px 0; color:#555; width:90px;">Quand</td>
					<td style="padding:4px 0; font-weight:600;">${MAKEUP.dates}</td>
				</tr>
				<tr>
					<td style="padding:4px 0; color:#555;">Horaire</td>
					<td style="padding:4px 0;">${horaire}</td>
				</tr>
				<tr>
					<td style="padding:4px 0; color:#555;">Lieu</td>
					<td style="padding:4px 0; font-weight:600;">Centre Nelson Mandela<br/>Rue de Ransbeek 227, 1120 Bruxelles</td>
				</tr>
			</table>
			<p style="margin:0 0 8px; font-weight:600;">À apporter :</p>
			<ul style="margin:0 0 20px; padding-left:20px; color:#333;">
				<li>Tenue de sport complète + crampons</li>
				<li>Ta carte d'identité originale</li>
				<li>Une bouteille d'eau</li>
			</ul>
			<p>Pour nous dire quel jour tu viens, écris-nous sur WhatsApp au ${WA_LINK}. Pour toute autre question, écris-nous sur WhatsApp ou par email à ${MAIL_LINK}.</p>
			<p style="margin-top:24px;">À très vite sur le terrain,<br/>L'équipe Brussels Summit Academy</p>
		`;
		return {
			from: env.RESEND_FROM as string,
			to: p.to,
			subject: "Tu n'as pas pu venir au Talent Day ? Viens te tester ce week-end",
			html: wrapEmail(content)
		};
	});

	// L'API « batch » de Resend envoie jusqu'à 100 emails en une seule requête.
	for (let i = 0; i < emails.length; i += 100) {
		const { error } = await getResend().batch.send(emails.slice(i, i + 100));
		if (error) throw new Error(`${error.name}: ${error.message}`);
	}
}

// Seconde chance : pour un joueur refusé, invitation à revenir se montrer ce week-end.
// (Le email de refus classique reste inchangé : sendRejectionEmail.)
export async function sendSecondChanceEmail(opts: {
	to: string;
	firstName: string;
	gender?: string | null;
}) {
	const g = (opts.gender ?? '').trim();
	const isFemale = /^(f|fille|femme|female|woman|girl)$/i.test(g);
	const isMale = /^(m|garcon|garçon|homme|male|man|boy)$/i.test(g);
	const horaire = isFemale
		? `<strong>${MAKEUP.girls}</strong>`
		: isMale
			? `<strong>${MAKEUP.boys}</strong>`
			: `<strong>${MAKEUP.girls}</strong> pour les filles, <strong>${MAKEUP.boys}</strong> pour les garçons`;

	const content = `
		<h2 style="margin:0 0 16px; font-size:20px; color:#1807b9;">Bonjour ${opts.firstName},</h2>
		<p>Merci d'être venu(e) te montrer et pour l'intérêt que tu portes à Brussels Summit Academy.</p>
		<p>Nous n'avons pas pu donner suite à ta candidature pour le moment, mais <strong>nous voulons te donner une seconde chance</strong> : tu es invité(e) à revenir t'entraîner avec nous ce week-end pour que nous puissions te revoir.</p>
		<table style="width:100%; border-collapse:collapse; margin:20px 0;">
			<tr>
				<td style="padding:4px 0; color:#555; width:90px;">Quand</td>
				<td style="padding:4px 0; font-weight:600;">${MAKEUP.dates}</td>
			</tr>
			<tr>
				<td style="padding:4px 0; color:#555;">Horaire</td>
				<td style="padding:4px 0;">${horaire}</td>
			</tr>
			<tr>
				<td style="padding:4px 0; color:#555;">Lieu</td>
				<td style="padding:4px 0; font-weight:600;">Centre Nelson Mandela<br/>Rue de Ransbeek 227, 1120 Bruxelles</td>
			</tr>
		</table>
		<p style="margin:0 0 8px; font-weight:600;">À apporter :</p>
		<ul style="margin:0 0 20px; padding-left:20px; color:#333;">
			<li>Tenue de sport complète + crampons</li>
			<li>Ta carte d'identité originale</li>
			<li>Une bouteille d'eau</li>
		</ul>
		<p>Pour nous dire quel jour tu viens, écris-nous sur WhatsApp au ${WA_LINK}. Pour toute autre question, écris-nous sur WhatsApp ou par email à ${MAIL_LINK}.</p>
		<p style="margin-top:24px;">Nous espérons te revoir très vite,<br/>L'équipe Brussels Summit Academy</p>
	`;
	await send({
		from: env.RESEND_FROM as string,
		to: opts.to,
		subject: 'Une seconde chance de te montrer — Brussels Summit Academy',
		html: wrapEmail(content)
	});
}

// ---- Email d'information aux joueurs acceptés : entraînement du dimanche, cash, formulaire ----
// (L'email d'acceptation lui-même reste inchangé.)
function buildAcceptedInfoEmail(opts: {
	firstName: string;
	gender?: string | null;
	formDone: boolean;
}) {
	const g = (opts.gender ?? '').trim();
	const isFemale = /^(f|fille|femme|female|woman|girl)$/i.test(g);
	const isMale = /^(m|garcon|garçon|homme|male|man|boy)$/i.test(g);
	const monthly = isFemale ? '50' : isMale ? '80' : null;
	const horaire = isFemale
		? `<strong>${MAKEUP.girls}</strong>`
		: isMale
			? `<strong>${MAKEUP.boys}</strong>`
			: `<strong>${MAKEUP.girls}</strong> pour les filles, <strong>${MAKEUP.boys}</strong> pour les garçons`;
	const link = `${SITE_URL}/inscription?type=academie&acces=accepte`;

	const formBlock = opts.formDone
		? `<p style="margin:24px 0; padding:12px 16px; background:#e8f7ec; border-radius:12px;">✅ Merci, nous avons bien reçu ton formulaire.</p>`
		: `<div style="margin:24px 0; padding:16px; background:#fff4e5; border:1px solid #f4b400; border-radius:12px;">
			<p style="margin:0 0 8px; font-weight:700; color:#1a1a1a;">⚠️ N'oublie pas de remplir le formulaire !</p>
			<p style="margin:0 0 12px;">C'est obligatoire : <strong>sans le formulaire complété, tu ne rejoins pas l'équipe.</strong> Il prend environ 10 minutes. Si tu es mineur·e, l'accord d'un parent ou responsable légal est nécessaire.</p>
			<a href="${link}" style="display:inline-block; background:#1807b9; color:#ffffff; padding:12px 24px; border-radius:999px; text-decoration:none; font-weight:600;">Remplir le formulaire</a>
		</div>`;

	const content = `
		<h2 style="margin:0 0 16px; font-size:20px; color:#1807b9;">Salut ${opts.firstName},</h2>
		<p>Petit message important pour ce week-end.</p>

		<p style="margin:24px 0 8px; font-weight:600;">Entraînement uniquement le dimanche 8 novembre</p>
		<p style="margin:0 0 8px;">Cette semaine, il n'y a entraînement que le <strong>dimanche</strong> (pas de séance le samedi).</p>
		<table style="width:100%; border-collapse:collapse; margin:0 0 20px;">
			<tr>
				<td style="padding:4px 0; color:#555; width:90px;">Horaire</td>
				<td style="padding:4px 0;">${horaire}</td>
			</tr>
			<tr>
				<td style="padding:4px 0; color:#555;">Lieu</td>
				<td style="padding:4px 0; font-weight:600;">Centre Nelson Mandela<br/>Rue de Ransbeek 227, 1120 Bruxelles</td>
			</tr>
		</table>

		<p style="margin:0 0 8px; font-weight:600;">À apporter :</p>
		<ul style="margin:0 0 20px; padding-left:20px; color:#333;">
			<li>Ta tenue de sport complète et tes crampons</li>
			<li>Ta carte d'identité originale</li>
			<li>Une bouteille d'eau</li>
			<li><strong>L'argent de ta cotisation en cash (espèces)</strong></li>
		</ul>

		<p style="margin:24px 0 8px; font-weight:600;">Cotisations (à régler en espèces) :</p>
		<table style="width:100%; border-collapse:collapse; margin-bottom:8px; font-size:15px; border-top:1px solid #e5e5ef; border-bottom:1px solid #e5e5ef;">
			<tr>
				<td style="padding:6px 0; color:#555;">Cotisation annuelle</td>
				<td style="padding:6px 0; font-weight:600; text-align:right;">150 € <span style="font-weight:400; color:#555;">(une fois par an)</span></td>
			</tr>
			<tr>
				<td style="padding:6px 0; color:#555;">Cotisation mensuelle</td>
				<td style="padding:6px 0; font-weight:600; text-align:right;">${monthly ? `${monthly} €` : '80 € (garçons) · 50 € (filles)'}</td>
			</tr>
		</table>

		${formBlock}

		<p>Une question ? Écris-nous sur WhatsApp au ${WA_LINK} ou par email à ${MAIL_LINK}.</p>
		<p style="margin-top:24px;">À dimanche sur le terrain,<br/>L'équipe Brussels Summit Academy</p>
	`;
	return {
		subject: 'Dimanche 8 novembre : entraînement, cotisation et formulaire',
		html: wrapEmail(content)
	};
}

export async function sendAcceptedInfoEmails(
	players: { to: string; firstName: string; gender?: string | null; formDone: boolean }[]
): Promise<void> {
	const emails = players.map((p) => {
		const { subject, html } = buildAcceptedInfoEmail(p);
		return { from: env.RESEND_FROM as string, to: p.to, subject, html };
	});
	// L'API « batch » de Resend envoie jusqu'à 100 emails en une seule requête.
	for (let i = 0; i < emails.length; i += 100) {
		const { error } = await getResend().batch.send(emails.slice(i, i + 100));
		if (error) throw new Error(`${error.name}: ${error.message}`);
	}
}


// Rappel de paiement : envoyé à la main depuis le dashboard quand un joueur tarde à payer.
export async function sendPaymentReminderEmail(opts: {
	to: string;
	firstName: string;
	monthLabel: string;
	amount: number;
}) {
	const content = `
		<h2 style="margin:0 0 16px; font-size:20px; color:#1807b9;">Salut ${opts.firstName},</h2>
		<p>Petit rappel : nous n'avons pas encore reçu ta mensualité de <strong>${opts.monthLabel}</strong> (<strong>${opts.amount} €</strong>).</p>
		<p>Merci de la régler dès que possible auprès du staff. Si tu as déjà payé, ou si tu as besoin d'un délai, dis-le-nous simplement : écris-nous sur WhatsApp au ${WA_LINK} ou par email à ${MAIL_LINK}.</p>
		<p style="margin-top:24px;">Merci !<br/>L'équipe Brussels Summit Academy</p>
	`;
	await send({
		from: env.RESEND_FROM as string,
		to: opts.to,
		subject: `Rappel : mensualité de ${opts.monthLabel}`,
		html: wrapEmail(content)
	});
}
