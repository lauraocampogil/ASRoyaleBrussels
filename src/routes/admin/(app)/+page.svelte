<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import type { SubmitFunction } from '@sveltejs/kit';
	import type { PageData } from './$types';
	import { autoArchived, isNoShow } from '$lib/archive';
	import FilterMenu from '$lib/components/admin/FilterMenu.svelte';
	import { cleanInstagram } from '$lib/instagram';
	import { DOSSIER_SECTIONS, FEES, MONTH_LABELS } from '$lib/dossier';

	let { data }: { data: PageData } = $props();
	let editingId = $state<number | null>(null);
	let genderFilter = $state<'all' | 'fille' | 'garcon'>('all');
	let resendResult = $state<Record<string, string>>({});
	let reminderResult = $state<Record<string, string>>({});

	const monthlyFee = (player: any) => {
		const g = normGender(player.gender);
		return g ? FEES.monthly[g] : null;
	};
	// --- Paiements : une ligne par paiement (date, type, montant) ---
	const payList = (player: any): any[] =>
		(Array.isArray(player.paiements) ? [...player.paiements] : []).sort((x, y) =>
			String(y.date).localeCompare(String(x.date))
		);
	const currentMonth = new Date().toISOString().slice(0, 7);
	let payDate = $state(new Date().toISOString().slice(0, 10));
	let payType = $state<'mensuel' | 'annuel'>('mensuel');
	let payMonth = $state(new Date().toISOString().slice(0, 7));
	const annualEntry = (player: any) => payList(player).find((e) => e.type === 'annuel');
	const monthEntry = (player: any, key: string) =>
		payList(player).find((e) => e.type === 'mensuel' && e.mois === key);
	const payTotal = (player: any) =>
		payList(player).reduce((sum, e) => sum + (Number(e.montant) || 0), 0);
	const monthLabel = (key: string | null) => {
		if (!key) return '';
		const [y, m] = key.split('-');
		return `${MONTH_LABELS[Number(m) - 1] ?? m} ${y}`;
	};
	let totalCollected = $derived(
		memberPlayers.reduce((sum: number, p: any) => sum + payTotal(p), 0)
	);
	// --- Paiements (vue mensuelle) ---
	let payFilter = $state<'all' | 'paid' | 'unpaid'>('all');
	let paySearch = $state('');
	let payPage = $state(1);
	const PAY_SIZE = 10;
	const payToday = new Date().toISOString().slice(0, 10);
	let payDateSel = $state(payToday);
	let payEditId = $state<number | null>(null);
	const remindEnhance = (name: string): SubmitFunction => ({ cancel }) => {
		if (!confirm(`Envoyer un rappel de paiement par email à ${name} ?`)) {
			cancel();
			return;
		}
		return async ({ result, update }) => {
			if (result.type === 'failure') alert(String((result.data as any)?.error ?? 'Erreur'));
			await update({ reset: false });
		};
	};
	const feeOf = (p: any) => (normGender(p.gender) === 'fille' ? FEES.monthly.fille : FEES.monthly.garcon);
	function shiftPayMonth(delta: number) {
		const [y, m] = payMonth.split('-').map(Number);
		const d = new Date(y, m - 1 + delta, 1);
		payMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
	}
	let payRows = $derived(
		memberPlayers.map((p: any) => ({
			p,
			month: monthEntry(p, payMonth),
			annual: annualEntry(p),
			rappel: payList(p).find((e: any) => e.type === 'rappel' && e.mois === payMonth),
			fee: feeOf(p)
		}))
	);
	let payExpected = $derived(payRows.reduce((s: number, r: any) => s + r.fee, 0));
	let payCollected = $derived(payRows.reduce((s: number, r: any) => s + (r.month ? Number(r.month.montant) || r.fee : 0), 0));
	let payPaidCount = $derived(payRows.filter((r: any) => r.month).length);
	let payAnnualCount = $derived(payRows.filter((r: any) => r.annual).length);
	let payFiltered = $derived(
		payRows.filter(
			(r: any) =>
				(payFilter === 'all' || (payFilter === 'paid' ? !!r.month : !r.month)) &&
				statsKey(`${r.p.first_name} ${r.p.last_name}`).includes(statsKey(paySearch.trim()))
		)
	);
	let payPageCount = $derived(Math.max(1, Math.ceil(payFiltered.length / PAY_SIZE)));
	let payPaged = $derived(payFiltered.slice((payPage - 1) * PAY_SIZE, payPage * PAY_SIZE));
	$effect(() => {
		payFilter;
		paySearch;
		payMonth;
		payPage = 1;
	});
	// --- Historique annuel (Paiements) et historique des séances (Présences) ---
	let payMode = $state<'mois' | 'annee'>('mois');
	let presMode = $state<'jour' | 'historique'>('jour');
	let histYear = $state(new Date().getFullYear());
	let histPayPage = $state(1);
	let histPresPage = $state(1);
	const histMonths = $derived(
		Array.from({ length: 12 }, (_, i) => `${histYear}-${String(i + 1).padStart(2, '0')}`)
	);
	let yearRows = $derived(
		memberPlayers.map((p: any) => {
			const cells = histMonths.map((k: string) => monthEntry(p, k));
			const annual = payList(p).find((e: any) => e.type === 'annuel' && String(e.date).startsWith(String(histYear)));
			const total =
				cells.reduce((sum: number, e: any) => sum + (e ? Number(e.montant) || 0 : 0), 0) +
				(annual ? Number(annual.montant) || 0 : 0);
			return { p, cells, annual, total };
		})
	);
	let yearTotal = $derived(yearRows.reduce((sum: number, r: any) => sum + r.total, 0));
	let yearMonthTotals = $derived(
		histMonths.map((_: string, i: number) => yearRows.filter((r: any) => r.cells[i]).length)
	);
	let yearPageCount = $derived(Math.max(1, Math.ceil(yearRows.length / 10)));
	let yearPaged = $derived(yearRows.slice((histPayPage - 1) * 10, histPayPage * 10));
	let sessionDates = $derived(
		[...new Set(memberPlayers.flatMap((p: any) => Object.keys(p.presences ?? {})))].sort() as string[]
	);
	let presRows = $derived(
		memberPlayers.map((p: any) => {
			const present = sessionDates.filter((d) => p.presences?.[d] === 'present').length;
			const absent = sessionDates.filter((d) => p.presences?.[d] === 'absent').length;
			return { p, present, absent, rate: present + absent ? Math.round((present / (present + absent)) * 100) : null };
		})
	);
	let presAvgRate = $derived(
		(() => {
			const r = presRows.filter((x: any) => x.rate !== null);
			return r.length ? Math.round(r.reduce((a: number, x: any) => a + x.rate, 0) / r.length) : 0;
		})()
	);
	let presHistPageCount = $derived(Math.max(1, Math.ceil(presRows.length / 10)));
	let presHistPaged = $derived(presRows.slice((histPresPage - 1) * 10, histPresPage * 10));
	// --- Présences (refonte) ---
	let psGender = $state<'all' | 'fille' | 'garcon'>('all');
	let psSearch = $state('');
	let psPage = $state(1);
	let psPeriod = $state<'semaine' | 'mois' | 'annee'>('semaine');
	let psRef = $state(new Date());
	let psHistPage = $state(1);
	const PS_SIZE = 10;
	const isoLocal = (d: Date) =>
		`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
	const addDays = (d: Date, n: number) => {
		const x = new Date(d);
		x.setDate(x.getDate() + n);
		return x;
	};
	const psKeep: SubmitFunction = () => async ({ update }) => {
		await update({ reset: false });
	};
	function psShiftDay(n: number) {
		presDate = isoLocal(addDays(new Date(presDate + 'T12:00:00'), n));
	}
	function psShiftPeriod(n: number) {
		const d = new Date(psRef);
		if (psPeriod === 'semaine') d.setDate(d.getDate() + 7 * n);
		else if (psPeriod === 'mois') d.setMonth(d.getMonth() + n, 1);
		else d.setFullYear(d.getFullYear() + n);
		psRef = d;
	}
	function isoWeek(d: Date) {
		const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
		t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7));
		const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
		return Math.ceil(((+t - +y0) / 86400000 + 1) / 7);
	}
	const shortDate = (iso: string) =>
		new Date(iso + 'T12:00:00').toLocaleDateString('fr-BE', { day: 'numeric', month: 'short' });
	const rateTone = (r: number | null) =>
		r === null
			? 'bg-[#f4f5f7] text-dark-accent'
			: r >= 75
				? 'bg-green-100 text-green-700'
				: r >= 50
					? 'bg-amber-100 text-amber-700'
					: 'bg-red-100 text-red-600';

	let psPlayers = $derived(
		memberPlayers.filter(
			(p: any) =>
				(psGender === 'all' || normGender(p.gender) === psGender) &&
				statsKey(`${p.first_name} ${p.last_name}`).includes(statsKey(psSearch.trim()))
		)
	);
	let psPaged = $derived(psPlayers.slice((psPage - 1) * PS_SIZE, psPage * PS_SIZE));
	let psPageCount = $derived(Math.max(1, Math.ceil(psPlayers.length / PS_SIZE)));
	let psDay = $derived({
		present: psPlayers.filter((p: any) => p.presences?.[presDate] === 'present').length,
		absent: psPlayers.filter((p: any) => p.presences?.[presDate] === 'absent').length,
		unset: psPlayers.filter((p: any) => !p.presences?.[presDate]).length
	});
	let psRecent = $derived([...sessionDates].reverse().slice(0, 6));
	const psLast = (p: any) => sessionDates.slice(-5).map((d: string) => p.presences?.[d] ?? '');

	let psRange = $derived.by(() => {
		const r = new Date(psRef);
		if (psPeriod === 'semaine') {
			const mon = addDays(r, -((r.getDay() + 6) % 7));
			const sun = addDays(mon, 6);
			return {
				start: isoLocal(mon),
				end: isoLocal(sun),
				label: `Semaine ${isoWeek(mon)} · ${shortDate(isoLocal(mon))} – ${shortDate(isoLocal(sun))} ${sun.getFullYear()}`
			};
		}
		if (psPeriod === 'mois') {
			const first = new Date(r.getFullYear(), r.getMonth(), 1);
			const last = new Date(r.getFullYear(), r.getMonth() + 1, 0);
			return {
				start: isoLocal(first),
				end: isoLocal(last),
				label: `${MONTH_LABELS[r.getMonth()]} ${r.getFullYear()}`
			};
		}
		return { start: `${r.getFullYear()}-01-01`, end: `${r.getFullYear()}-12-31`, label: String(r.getFullYear()) };
	});
	let psSessions = $derived(sessionDates.filter((d: string) => d >= psRange.start && d <= psRange.end));
	let psMonths = $derived(
		Array.from({ length: 12 }, (_, i) => `${psRange.start.slice(0, 4)}-${String(i + 1).padStart(2, '0')}`)
	);
	let psHistRows = $derived(
		memberPlayers
			.filter((p: any) => psGender === 'all' || normGender(p.gender) === psGender)
			.map((p: any) => {
				const inRange = psSessions.map((d: string) => p.presences?.[d] ?? '');
				const present = inRange.filter((v: string) => v === 'present').length;
				const absent = inRange.filter((v: string) => v === 'absent').length;
				const months = psMonths.map((m: string) => {
					const ds = sessionDates.filter((d: string) => d.startsWith(m));
					const pr = ds.filter((d: string) => p.presences?.[d] === 'present').length;
					const ab = ds.filter((d: string) => p.presences?.[d] === 'absent').length;
					return { pr, tot: pr + ab, rate: pr + ab ? Math.round((pr / (pr + ab)) * 100) : null };
				});
				const mp = months.reduce((a: number, x: any) => a + x.pr, 0);
				const mt = months.reduce((a: number, x: any) => a + x.tot, 0);
				const total = psPeriod === 'annee' ? mt : present + absent;
				const good = psPeriod === 'annee' ? mp : present;
				return { p, inRange, months, present: good, total, rate: total ? Math.round((good / total) * 100) : null };
			})
	);
	let psTotalPresent = $derived(psHistRows.reduce((a: number, r: any) => a + r.present, 0));
	let psTotalAll = $derived(psHistRows.reduce((a: number, r: any) => a + r.total, 0));
	let psTotalRate = $derived(psTotalAll ? Math.round((psTotalPresent / psTotalAll) * 100) : null);
	let psHistPaged = $derived(psHistRows.slice((psHistPage - 1) * PS_SIZE, psHistPage * PS_SIZE));
	let psHistPageCount = $derived(Math.max(1, Math.ceil(psHistRows.length / PS_SIZE)));
	let psAvg = $derived.by(() => {
		const r = psHistRows.filter((x: any) => x.rate !== null);
		return r.length ? Math.round(r.reduce((a: number, x: any) => a + x.rate, 0) / r.length) : null;
	});
	// Barres : une par séance (semaine/mois) ou par mois (année) = nb de présents
	let psBars = $derived(
		psPeriod === 'annee'
			? psMonths.map((m: string, i: number) => ({
					label: MONTH_LABELS[i].slice(0, 3),
					value: psHistRows.reduce((a: number, r: any) => a + r.months[i].pr, 0),
					total: psHistRows.reduce((a: number, r: any) => a + r.months[i].tot, 0)
				}))
			: psSessions.map((d: string) => ({
					label: shortDate(d),
					value: psHistRows.filter((r: any) => r.p.presences?.[d] === 'present').length,
					total: psHistRows.filter((r: any) => r.p.presences?.[d]).length
				}))
	);
	$effect(() => {
		psGender;
		psSearch;
		psPage = 1;
	});
	$effect(() => {
		psGender;
		psPeriod;
		psRef;
		psHistPage = 1;
	});
	const FOOT: Record<string, string> = { droit: 'Droit', gauche: 'Gauche', les_deux: 'Les deux' };
	function fmtDossier(key: string, value: unknown) {
		if (value === true) return 'Oui';
		if (value === false) return 'Non';
		if (key === 'pied') return FOOT[String(value)] ?? String(value);
		if (key === 'disponible' || key === 'info_contrat' || key === 'selection_nationale')
			return value === 'oui' ? 'Oui' : value === 'non' ? 'Non' : String(value);
		return String(value);
	}
	let presenceFilter = $state<'all' | 'venu' | 'pas_venu' | 'inconnu'>('all');
	let makeupResult = $state('');
	let infoResult = $state('');
	let infoSending = $state(false);
	let makeupSending = $state(false);
	let tdAll = $derived(data.players.filter((p: any) => p.type === 'talent_days'));
	const hasDossierOf = (p: any) => !!p.dossier && Object.keys(p.dossier).length > 0;
	let tdEditionPassed = $derived(data.talentDayEdition?.passed ?? false);
	let tdUpcomingCount = $derived(tdArchived ? 0 : tdAll.length);
	let essaiAll = $derived(data.players.filter((p: any) => p.type !== 'talent_days'));
	// Même logique que la page Joueurs : « pas venus » = historique, et après le Talent Day
	// les demandes à traiter ne viennent plus que de « Faire un essai ».
	let essaiEmails = $derived(
		new Set(
			data.players
				.filter((p: any) => p.type !== 'talent_days')
				.map((p: any) => String(p.email ?? '').toLowerCase())
		)
	);
	const archiveCtx = $derived({
		talentDayDate: data.talentDayEdition?.date ?? '',
		talentDayPassed: data.talentDayEdition?.passed ?? false,
		essaiEmails
	});
	// Archivé = archivé à la main OU « pas venu » depuis plus de 7 jours (automatique).
	const isArch = (p: any) =>
		p.status !== 'accepted' && (p.archived === true || autoArchived(p, archiveCtx));
	const stageOfPlayer = (p: any) => {
		if (isArch(p)) return 'archive';
		if (isNoShow(p, archiveCtx.talentDayPassed)) return 'absent';
		if (p.status === 'accepted') return hasDossierOf(p) ? 'complete' : 'accepted';
		return p.status === 'rejected' ? 'rejected' : 'pending';
	};
	let toTreatCount = $derived(data.players.filter((p: any) => stageOfPlayer(p) === 'pending').length);
	let absentHistoryCount = $derived(data.players.filter((p: any) => stageOfPlayer(p) === 'absent').length);
	let rejectedStageCount = $derived(data.players.filter((p: any) => stageOfPlayer(p) === 'rejected').length);
	let dossierMissingCount = $derived(
		data.players.filter((p: any) => p.status === 'accepted' && !hasDossierOf(p)).length
	);
	let memberCount = $derived(
		data.players.filter((p: any) => p.status === 'accepted' && hasDossierOf(p)).length
	);
	let presentCount = $derived(tdAll.filter((p: any) => p.venue === true).length);
	let absentCount = $derived(tdAll.filter((p: any) => p.venue === false).length);
	let unknownCount = $derived(tdAll.filter((p: any) => p.venue !== true && p.venue !== false).length);
	let makeupPending = $derived(
		tdAll.filter((p: any) => p.venue === false && p.rattrapage_envoye !== true && p.email).length
	);
	// --- Présences : une date, un statut par joueur, un seul enregistrement ---
	const todayIso = new Date().toISOString().slice(0, 10);
	let presDate = $state(todayIso);
	let presForm = $state<HTMLFormElement | null>(null);
	let presMsg = $state('');
	let presOpen = $state<number | null>(null);
	const presList = (player: any): [string, string][] =>
		Object.entries(player.presences ?? {}).sort((x, y) => y[0].localeCompare(x[0])) as [
			string,
			string
		][];
	const fmtLong = (d: string) =>
		new Intl.DateTimeFormat('fr-BE', {
			weekday: 'long',
			day: 'numeric',
			month: 'long',
			year: 'numeric'
		}).format(new Date(d));
	const presOf = (player: any, date: string): string => player.presences?.[date] ?? '';
	const presTotal = (player: any, status: string) =>
		Object.values(player.presences ?? {}).filter((v) => v === status).length;
	function markAll(status: 'present' | 'absent') {
		presForm
			?.querySelectorAll<HTMLInputElement>(`input[type="radio"][value="${status}"]`)
			.forEach((r) => (r.checked = true));
	}
	let payForm = $state<HTMLFormElement | null>(null);
	let payMsg = $state('');
	function checkAllPay() {
		payForm
			?.querySelectorAll<HTMLInputElement>('input[type="checkbox"][name="paid"]:not(:disabled)')
			.forEach((c) => (c.checked = true));
	}
	let showAdd = $state(false);
	let addError = $state('');

	// Venue : la couleur change tout de suite (valeur locale), puis la page se met à jour.
	let venueLocal = $state<Record<string, boolean | null>>({});
	let venueError = $state<Record<string, string>>({});
	const venueOf = (player: any): boolean | null =>
		player.id in venueLocal ? venueLocal[player.id] : (player.venue ?? null);
	function venueClasses(v: boolean | null) {
		if (v === true) return 'bg-green-100 text-green-700 border-green-300';
		if (v === false) return 'bg-red-100 text-red-700 border-red-300';
		return 'bg-[#f4f5f7] text-dark-accent border-dark-accent/20';
	}
	const venueEnhance =
		(player: any): SubmitFunction =>
		({ formData }) => {
			const raw = String(formData.get('venue') ?? '');
			const previous = venueOf(player);
			venueLocal[player.id] = raw === 'true' ? true : raw === 'false' ? false : null;
			venueError[player.id] = '';
			return async ({ result, update }) => {
				if (result.type !== 'success') {
					venueLocal[player.id] = previous;
					venueError[player.id] =
						result.type === 'failure'
							? String((result.data as any)?.error ?? 'Erreur')
							: 'Erreur';
				}
				await update({ reset: false });
			};
		};

	// Rappel Talent Day, envoyé à la main : demande confirmation si déjà envoyé.
	const reminderEnhance =
		(player: any): SubmitFunction =>
		({ cancel }) => {
			if (
				player.reminder_sent === true &&
				reminderResult[player.id] !== 'ok' &&
				!confirm(`Le rappel a déjà été envoyé. Le renvoyer à ${player.email} ?`)
			) {
				cancel();
				return;
			}
			reminderResult[player.id] = 'sending';
			return async ({ result, update }) => {
				reminderResult[player.id] =
					result.type === 'success'
						? 'ok'
						: result.type === 'failure'
							? String((result.data as any)?.error ?? 'Erreur')
							: 'Erreur';
				await update({ reset: false });
			};
		};

	// Renvoi de l'email de confirmation : demande confirmation si un email est déjà parti
	// (ou si son statut est inconnu), puis affiche le résultat à côté du joueur.
	const resendEnhance =
		(player: any): SubmitFunction =>
		({ cancel, formElement }) => {
			formElement.closest('details')?.removeAttribute('open');
			if (
				player.email_envoye !== false &&
				!confirm(`Renvoyer l'email de confirmation à ${player.email} ?`)
			) {
				cancel();
				return;
			}
			resendResult[player.id] = 'sending';
			return async ({ result, update }) => {
				resendResult[player.id] =
					result.type === 'success'
						? 'ok'
						: result.type === 'failure'
							? String((result.data as any)?.error ?? 'Erreur')
							: 'Erreur';
				await update({ reset: false });
			};
		};

	function normGender(g: string | null | undefined): 'fille' | 'garcon' | null {
		const v = (g ?? '').toString().trim().toLowerCase();
		if (['fille', 'femme', 'female', 'f', 'girl', 'woman'].includes(v)) return 'fille';
		if (['garcon', 'garçon', 'homme', 'male', 'm', 'boy', 'man'].includes(v)) return 'garcon';
		return null;
	}

	let viewMode = $derived(
		(page.url.searchParams.get('view') as
			'overview' | 'talent_days' | 'academie' | 'inscrits' | 'stats' | 'presences' | 'paiements') ?? 'overview'
	);

	function changeView(view: string) {
		goto(`/admin?view=${view}`, { keepFocus: true, noScroll: true, replaceState: true });
	}

	const DIVISIONS: { value: string; label: string }[] = [
		{ value: '', label: 'Sélectionne une division' },
		{ value: 'nationale_1', label: 'Nationale 1' },
		{ value: 'nationale_2', label: 'Nationale 2' },
		{ value: 'nationale_3', label: 'Nationale 3' },
		{ value: 'provinciale_1', label: 'Provinciale 1' },
		{ value: 'provinciale_2', label: 'Provinciale 2' },
		{ value: 'provinciale_3', label: 'Provinciale 3' },
		{ value: 'provinciale_4', label: 'Provinciale 4' },
		{ value: 'regionale', label: 'Régionale' },
		{ value: 'u16_elite', label: 'U16 Elite' },
		{ value: 'u18_elite', label: 'U18 Elite' },
		{ value: 'u23', label: 'U23' },
		{ value: 'autre', label: 'Autre' }
	];

	function formatDate(value: string | null) {
		if (!value) return '—';
		return new Intl.DateTimeFormat('fr-BE', {
			day: 'numeric',
			month: 'short',
			year: 'numeric'
		}).format(new Date(value));
	}

	function toDateInput(value: string | null) {
		if (!value) return '';
		return value.slice(0, 10);
	}

	function statusClasses(status: string) {
		if (status === 'accepted') return 'bg-green-100 text-green-700 border-green-300';
		if (status === 'rejected') return 'bg-red-100 text-red-700 border-red-300';
		return 'bg-yellow-100 text-yellow-800 border-yellow-300';
	}

	function statusLabel(status: string) {
		if (status === 'accepted') return 'Accepté';
		if (status === 'rejected') return 'Refusé';
		return 'En attente';
	}

	// Demande une confirmation avant tout changement de statut qui envoie un email.
	function confirmStatusChange(player: any, next: string) {
		const name = `${player.first_name} ${player.last_name}`;
		if (next === 'accepted' && player.status !== 'accepted') {
			return confirm(`Accepter ${name} ?\n\nUn email d'acceptation sera envoyé à ${player.email}.`);
		}
		if (next === 'rejected' && player.status !== 'rejected') {
			return confirm(`Refuser ${name} ?\n\nUn email de refus sera envoyé à ${player.email}.`);
		}
		if (next === 'rejected_second_chance') {
			return confirm(
				`Refuser ${name} avec une seconde chance ?\n\nUn email l'invitant à revenir ce week-end sera envoyé à ${player.email} (à la place de l'email de refus).`
			);
		}
		if (next === 'pending_correction') {
			return confirm(
				`Remettre ${name} en attente ?\n\nUn email « envoyé par erreur » sera envoyé à ${player.email}.`
			);
		}
		return true;
	}

	function genderLabel(g: string | null) {
		const n = normGender(g);
		if (n === 'fille') return 'Femme';
		if (n === 'garcon') return 'Homme';
		return 'Non renseigné';
	}

	function divisionLabel(d: string | null) {
		return d ? (DIVISIONS.find((o) => o.value === d)?.label ?? d) : '—';
	}

	function initials(player: any) {
		const a = player.first_name?.[0] ?? '';
		const b = player.last_name?.[0] ?? '';
		return (a + b).toUpperCase() || '?';
	}

	let talentDayPlayers = $derived(
		data.players.filter((p: any) => p.type === 'talent_days' && p.status !== 'accepted')
	);
	let academiePlayers = $derived(
		data.players.filter((p: any) => p.type === 'academie' && p.status !== 'accepted')
	);
	let acceptedPlayers = $derived(data.players.filter((p: any) => p.status === 'accepted'));
	// Seuls les joueurs acceptés ayant rempli tout le formulaire de dossier sont suivis (présences, paiements).
	let memberPlayers = $derived(acceptedPlayers.filter((p: any) => hasDossierOf(p)));
	let notMemberYet = $derived(acceptedPlayers.filter((p: any) => !hasDossierOf(p)));

	let femaleCount = $derived(
		data.players.filter((p: any) => normGender(p.gender) === 'fille').length
	);
	let maleCount = $derived(
		data.players.filter((p: any) => normGender(p.gender) === 'garcon').length
	);
	let genderKnownTotal = $derived(femaleCount + maleCount);

	let pendingCount = $derived(data.players.filter((p: any) => p.status === 'pending').length);
	let rejectedCount = $derived(data.players.filter((p: any) => p.status === 'rejected').length);

	let completeCount = $derived(data.players.filter((p: any) => p.complete).length);
	let completionRate = $derived(
		data.players.length ? Math.round((completeCount / data.players.length) * 100) : 0
	);

	let recentPlayers = $derived(data.players.slice(0, 5));

	let talentDayDaysLeft = $derived(
		data.talentDayEdition
			? Math.ceil((new Date(data.talentDayEdition.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
			: null
	);

	function pct(count: number, total: number) {
		return total ? Math.round((count / total) * 100) : 0;
	}

	let tdArchived = $derived(data.talentDayEdition?.archived ?? false);
	let tdTab = $state<'current' | 'history'>('current');
	// Édition en cours : visible jusqu'à 7 jours après l'événement, puis vide (tout passe en historique).
	// Une fois l'édition passée, les « pas venus » partent directement en historique.
	let tdShown = $derived(
		tdTab === 'history'
			? talentDayPlayers
			: tdArchived
				? []
				: tdEditionPassed
					? talentDayPlayers.filter((p: any) => p.venue !== false)
					: talentDayPlayers
	);

	let baseFiltered = $derived(
		viewMode === 'talent_days'
			? tdShown
			: viewMode === 'academie'
				? academiePlayers
				: acceptedPlayers
	);

	let lsStatus = $state<'all' | 'pending' | 'rejected' | 'archived'>('all');
	let lsSearch = $state('');
	let expandedId = $state<number | null>(null);
	let filteredPlayers = $derived(
		(genderFilter === 'all'
			? baseFiltered
			: baseFiltered.filter((p: any) => normGender(p.gender) === genderFilter)
		).filter((p: any) =>
			(viewMode !== 'talent_days' && viewMode !== 'academie') || presenceFilter === 'all'
				? true
				: presenceFilter === 'venu'
					? p.venue === true
					: presenceFilter === 'pas_venu'
						? p.venue === false
						: p.venue !== true && p.venue !== false
		)
			.filter((p: any) =>
				lsStatus === 'archived'
					? isArch(p)
					: isArch(p)
						? false
						: lsStatus === 'all'
							? true
							: lsStatus === 'pending'
								? p.status === 'pending' && p.venue !== false
								: p.status === lsStatus
			)
			.filter((p: any) =>
				statsKey(`${p.first_name} ${p.last_name} ${p.email}`).includes(statsKey(lsSearch.trim()))
			)
	);
	let lsCounts = $derived({
		total: baseFiltered.filter((p: any) => !isArch(p)).length,
		pending: baseFiltered.filter((p: any) => p.status === 'pending' && p.venue !== false && !isArch(p)).length,
		archived: baseFiltered.filter((p: any) => isArch(p)).length,
		rejected: baseFiltered.filter((p: any) => p.status === 'rejected' && !isArch(p)).length,
		venu: baseFiltered.filter((p: any) => p.venue === true).length,
		pasVenu: baseFiltered.filter((p: any) => p.venue === false).length
	});
	const ageOf = (d: string | null) =>
		d ? Math.floor((Date.now() - new Date(d).getTime()) / 31557600000) : null;
	const statusBar = (p: any) =>
		p.venue === false && p.status === 'pending'
			? 'border-l-gray-300'
			: p.status === 'rejected'
				? 'border-l-red-400'
				: p.status === 'accepted'
					? 'border-l-blue-500'
					: 'border-l-amber-400';

	let statsPage = $state(1);
	let statsPaged = $derived(statsPlayers.slice((statsPage - 1) * 10, (statsPage + 0) * 10));
	let statsPageCount = $derived(Math.max(1, Math.ceil(statsPlayers.length / 10)));
	let statsGoals = $derived(statsPlayers.reduce((a: number, p: any) => a + (Number((p.siteProfile ?? p.stats)?.goals) || 0), 0));
	let statsAssists = $derived(statsPlayers.reduce((a: number, p: any) => a + (Number((p.siteProfile ?? p.stats)?.assists) || 0), 0));
	let statsMissing = $derived(statsPlayers.filter((p: any) => !p.siteProfile).length);
	$effect(() => {
		genderFilter;
		statsSearch;
		statsPage = 1;
	});

	const LIST_SIZE = 10;
	let listPage = $state(1);
	let listPageCount = $derived(Math.max(1, Math.ceil(filteredPlayers.length / LIST_SIZE)));
	let pagedPlayers = $derived(
		filteredPlayers.slice((listPage - 1) * LIST_SIZE, listPage * LIST_SIZE)
	);
	$effect(() => {
		viewMode;
		genderFilter;
		presenceFilter;
		lsStatus;
		lsSearch;
		tdTab;
		listPage = 1;
	});

	// Dans la liste "Joueurs inscrits" (mixte), on sait s'il faut montrer les colonnes
	// académie dès qu'au moins un joueur affiché est de type "academie".
	let showAcademieFields = $derived(viewMode === 'academie' || viewMode === 'inscrits');
	let statsSearch = $state('');
	let savedId = $state<number | null>(null);

	function statsKey(s: string) {
		return (s ?? '')
			.normalize('NFD')
			.replace(/[\u0300-\u036f]/g, '')
			.toLowerCase();
	}

	let statsPlayers = $derived(
		memberPlayers.filter(
			(p: any) =>
				(genderFilter === 'all' || normGender(p.gender) === genderFilter) &&
				statsKey(`${p.first_name} ${p.last_name}`).includes(statsKey(statsSearch.trim()))
		)
	);
</script>

{#snippet statusSelect(player: any)}
	<form method="POST" action="?/updateStatus" use:enhance class="print:hidden">
		<input type="hidden" name="id" value={player.id} />
		<select
			name="status"
			value={player.status}
			onchange={(e) => {
				const el = e.currentTarget;
				if (!confirmStatusChange(player, el.value)) {
					el.value = player.status;
					return;
				}
				el.form?.requestSubmit();
			}}
			class="w-full min-w-32.5 rounded-full border px-3 py-2 text-sm font-medium {statusClasses(
				player.status
			)}"
		>
			<option value="pending">En attente</option>
			<option value="accepted">Accepté</option>
			<option value="rejected">Refusé</option>
			{#if player.status === 'accepted'}
				<option value="pending_correction">En attente + email « envoyé par erreur »</option>
			{:else}
				<option value="rejected_second_chance">Refusé + email « seconde chance »</option>
			{/if}
		</select>
	</form>
	<span class="hidden text-sm font-medium print:inline">{statusLabel(player.status)}</span>
{/snippet}

{#snippet resendButton(player: any)}
	{#if player.email_envoye === true || resendResult[player.id] === 'ok'}
		<details class="relative ml-2 inline-block align-middle print:hidden">
			<summary
				class="cursor-pointer list-none rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700"
				title="Resend a accepté l'email. Pour confirmer la livraison, ouvre Resend > Emails."
				>✓ Email envoyé ▾</summary
			>
			<div
				class="absolute left-0 z-20 mt-1 w-44 rounded-xl border border-dark-accent/10 bg-white p-1 shadow-lg"
			>
				<form method="POST" action="?/resendConfirmation" use:enhance={resendEnhance(player)}>
					<input type="hidden" name="id" value={player.id} />
					<button
						type="submit"
						class="w-full rounded-lg px-3 py-2 text-left text-xs text-dark hover:bg-[#f4f5f7]"
					>
						Renvoyer l'email
					</button>
				</form>
			</div>
		</details>
	{:else}
		<form
			method="POST"
			action="?/resendConfirmation"
			use:enhance={resendEnhance(player)}
			class="inline print:hidden"
		>
			<input type="hidden" name="id" value={player.id} />
			{#if player.email_envoye === false}
				<button
					type="submit"
					title={player.email_erreur
						? `Erreur : ${player.email_erreur}`
						: "L'email n'a pas été envoyé"}
					class="ml-2 rounded-full bg-red-600 px-2 py-0.5 text-xs font-medium text-white"
				>
					Email non envoyé · Renvoyer
				</button>
			{:else}
				<button
					type="submit"
					title="Statut inconnu : inscription faite avant le suivi des emails"
					class="ml-2 rounded-full bg-[#f4f5f7] px-2 py-0.5 text-xs text-dark-accent hover:bg-dark-accent/10"
				>
					Renvoyer l'email
				</button>
			{/if}
		</form>
	{/if}
	{#if resendResult[player.id] === 'sending'}
		<span class="ml-2 text-xs text-dark-accent print:hidden">Envoi...</span>
	{:else if resendResult[player.id] && resendResult[player.id] !== 'ok'}
		<span class="ml-2 text-xs font-medium text-red-600 print:hidden">{resendResult[player.id]}</span>
	{/if}
{/snippet}

{#snippet reminderButton(player: any)}
	{#if player.type === 'talent_days'}
		<form method="POST" action="?/sendReminder" use:enhance={reminderEnhance(player)} class="inline print:hidden">
			<input type="hidden" name="id" value={player.id} />
			<button
				type="submit"
				class="ml-2 rounded-full px-2 py-0.5 text-xs font-medium {player.reminder_sent === true ||
				reminderResult[player.id] === 'ok'
					? 'bg-green-100 text-green-700'
					: 'bg-[#f4f5f7] text-dark-accent hover:bg-dark-accent/10'}"
			>
				{player.reminder_sent === true || reminderResult[player.id] === 'ok'
					? '✓ Rappel envoyé'
					: 'Envoyer le rappel'}
			</button>
		</form>
		{#if reminderResult[player.id] === 'sending'}
			<span class="ml-2 text-xs text-dark-accent print:hidden">Envoi...</span>
		{:else if reminderResult[player.id] && reminderResult[player.id] !== 'ok'}
			<span class="ml-2 text-xs font-medium text-red-600 print:hidden">{reminderResult[player.id]}</span>
		{/if}
	{/if}
{/snippet}

{#snippet venueSelect(player: any)}
	<form method="POST" action="?/updateVenue" use:enhance={venueEnhance(player)} class="mt-1 print:hidden">
		<input type="hidden" name="id" value={player.id} />
		<select
			name="venue"
			value={venueOf(player) === true ? 'true' : venueOf(player) === false ? 'false' : ''}
			onchange={(e) => e.currentTarget.form?.requestSubmit()}
			class="w-full min-w-32.5 rounded-full border px-3 py-2 text-sm font-medium {venueClasses(
				venueOf(player)
			)}"
		>
			<option value="">Venue : —</option>
			<option value="true">Venu</option>
			<option value="false">Pas venu</option>
		</select>
		{#if venueError[player.id]}
			<span class="mt-1 block text-xs font-medium text-red-600">{venueError[player.id]}</span>
		{/if}
	</form>
	<span class="hidden text-sm font-medium print:inline"
		>{venueOf(player) === true ? 'Venu' : venueOf(player) === false ? 'Pas venu' : ''}</span
	>
{/snippet}

{#snippet extraPanel(player: any)}
	{#if viewMode !== 'talent_days' && player.dossier}
		<div class="mt-3 flex flex-col gap-3 print:hidden">
			{#if player.dossier}
				<details
					open={viewMode === 'inscrits'}
					class="rounded-xl border border-dark-accent/10 bg-white p-3"
				>
					<summary class="cursor-pointer text-sm font-semibold text-dark"
						>Dossier de candidature</summary
					>
					<div class="mt-3 flex items-center gap-2 text-xs text-dark-accent">
						Carte d'identité : {@render idCardButtons(player)}
					</div>
					<div class="mt-3 flex flex-col gap-4">
						{#each DOSSIER_SECTIONS as section (section.title)}
							{@const rows = section.fields.filter(
								([k]) => player.dossier[k] !== null && player.dossier[k] !== undefined && player.dossier[k] !== ''
							)}
							{#if rows.length}
								<div>
									<p class="mb-1 text-xs font-semibold uppercase text-dark-accent">{section.title}</p>
									<dl class="grid grid-cols-1 gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
										{#each rows as [k, label] (k)}
											<div>
												<dt class="text-xs text-dark-accent">{label}</dt>
												<dd class="whitespace-pre-line text-dark">
													{#if k === 'photo_club'}
														<a
															href={`/admin/id-card/${player.dossier[k]}`}
															target="_blank"
															class="inline-block"
														>
															<img
																src={`/admin/id-card/${player.dossier[k]}`}
																alt="Photo avec son club"
																class="h-28 w-auto rounded-lg border border-dark-accent/20 object-cover"
															/>
														</a>
													{:else}
														{fmtDossier(k, player.dossier[k])}
													{/if}
												</dd>
											</div>
										{/each}
									</dl>
								</div>
							{/if}
						{/each}
					</div>
				</details>
			{/if}
		</div>
	{/if}
{/snippet}

{#snippet idCardButtons(player: any)}
	<div class="flex gap-2">
		{#if player.id_card_front}
			<a
				href={`/admin/id-card/${player.id_card_front}`}
				target="_blank"
				class="rounded-xl bg-[#f4f5f7] px-3 py-1.5 text-xs text-dark-accent transition-colors hover:bg-dark-accent/10"
			>
				Recto
			</a>
		{/if}
		{#if player.id_card_back}
			<a
				href={`/admin/id-card/${player.id_card_back}`}
				target="_blank"
				class="rounded-xl bg-[#f4f5f7] px-3 py-1.5 text-xs text-dark-accent transition-colors hover:bg-dark-accent/10"
			>
				Verso
			</a>
		{/if}
	</div>
{/snippet}

{#snippet valueOrMissing(value: string | null | undefined)}
	{#if value}
		{value}
	{:else}
		<span class="font-medium text-red-600">Manquant</span>
	{/if}
{/snippet}

{#snippet editForm(player: any)}
	<form
		method="POST"
		action="?/updatePlayer"
		enctype="multipart/form-data"
		use:enhance={() => {
			return async ({ update }) => {
				await update();
				editingId = null;
			};
		}}
		class="mt-3 grid grid-cols-1 gap-3 rounded-xl border border-dark-accent/10 bg-[#f4f5f7] p-4 sm:grid-cols-2"
	>
		<input type="hidden" name="id" value={player.id} />

		<label class="text-xs text-dark-accent">
			Prénom
			<input
				name="first_name"
				value={player.first_name}
				class="mt-1 w-full rounded-lg border border-dark-accent/20 bg-white px-3 py-2 text-sm text-dark"
			/>
		</label>
		<label class="text-xs text-dark-accent">
			Nom
			<input
				name="last_name"
				value={player.last_name}
				class="mt-1 w-full rounded-lg border border-dark-accent/20 bg-white px-3 py-2 text-sm text-dark"
			/>
		</label>
		<label class="text-xs text-dark-accent">
			Genre
			<select
				name="gender"
				value={player.gender ?? ''}
				class="mt-1 w-full rounded-lg border border-dark-accent/20 bg-white px-3 py-2 text-sm text-dark"
			>
				<option value="">—</option>
				<option value="fille">Femme</option>
				<option value="garcon">Homme</option>
			</select>
		</label>
		<label class="text-xs text-dark-accent">
			Date de naissance
			<input
				type="date"
				name="birth_date"
				value={toDateInput(player.birth_date)}
				class="mt-1 w-full rounded-lg border border-dark-accent/20 bg-white px-3 py-2 text-sm text-dark"
			/>
		</label>
		<label class="text-xs text-dark-accent">
			Téléphone
			<input
				name="phone"
				value={player.phone}
				class="mt-1 w-full rounded-lg border border-dark-accent/20 bg-white px-3 py-2 text-sm text-dark"
			/>
		</label>
		<label class="text-xs text-dark-accent">
			Instagram
			<input
				name="instagram"
				value={player.instagram ?? ''}
				placeholder="@pseudo"
				class="mt-1 w-full rounded-lg border border-dark-accent/20 bg-white px-3 py-2 text-sm text-dark"
			/>
		</label>
		<label class="text-xs text-dark-accent">
			Poste préféré
			<input
				name="preferred_position"
				value={player.preferred_position}
				class="mt-1 w-full rounded-lg border border-dark-accent/20 bg-white px-3 py-2 text-sm text-dark"
			/>
		</label>
		<label class="text-xs text-dark-accent">
			Email
			<input
				type="email"
				name="email"
				value={player.email}
				class="mt-1 w-full rounded-lg border border-dark-accent/20 bg-white px-3 py-2 text-sm text-dark"
			/>
		</label>
		<label class="text-xs text-dark-accent">
			Club actuel
			<input
				name="current_club"
				value={player.current_club}
				class="mt-1 w-full rounded-lg border border-dark-accent/20 bg-white px-3 py-2 text-sm text-dark"
			/>
		</label>
		<label class="text-xs text-dark-accent sm:col-span-2">
			Division
			<select
				name="division"
				value={player.division ?? ''}
				class="mt-1 w-full rounded-lg border border-dark-accent/20 bg-white px-3 py-2 text-sm text-dark"
			>
				{#each DIVISIONS as option}
					<option value={option.value}>{option.label}</option>
				{/each}
			</select>
		</label>

		{#if player.type === 'academie' || player.status === 'accepted'}
			<label class="text-xs text-dark-accent">
				Lieu de naissance
				<input
					name="birth_place"
					value={player.birth_place ?? ''}
					class="mt-1 w-full rounded-lg border border-dark-accent/20 bg-white px-3 py-2 text-sm text-dark"
				/>
			</label>
			<label class="text-xs text-dark-accent">
				Nationalité
				<input
					name="nationality"
					value={player.nationality ?? ''}
					class="mt-1 w-full rounded-lg border border-dark-accent/20 bg-white px-3 py-2 text-sm text-dark"
				/>
			</label>
			<label class="text-xs text-dark-accent sm:col-span-2">
				Adresse postale
				<input
					name="address"
					value={player.address ?? ''}
					class="mt-1 w-full rounded-lg border border-dark-accent/20 bg-white px-3 py-2 text-sm text-dark"
				/>
			</label>
			<label class="text-xs text-dark-accent">
				Code postal
				<input
					name="postal_code"
					value={player.postal_code ?? ''}
					class="mt-1 w-full rounded-lg border border-dark-accent/20 bg-white px-3 py-2 text-sm text-dark"
				/>
			</label>
		{/if}

		<label class="text-xs text-dark-accent">
			Carte d'identité — Recto
			<span class="ml-1 {player.id_card_front ? 'text-green-600' : 'text-red-600'}">
				{player.id_card_front ? '(fournie)' : '(manquante)'}
			</span>
			<input
				type="file"
				name="id_card_front"
				accept="image/*,.pdf"
				class="mt-1 w-full rounded-lg border border-dark-accent/20 bg-white px-3 py-2 text-sm text-dark"
			/>
		</label>
		<label class="text-xs text-dark-accent">
			Carte d'identité — Verso
			<span class="ml-1 {player.id_card_back ? 'text-green-600' : 'text-red-600'}">
				{player.id_card_back ? '(fournie)' : '(manquante)'}
			</span>
			<input
				type="file"
				name="id_card_back"
				accept="image/*,.pdf"
				class="mt-1 w-full rounded-lg border border-dark-accent/20 bg-white px-3 py-2 text-sm text-dark"
			/>
		</label>

		<div class="flex gap-2 sm:col-span-2">
			<button
				type="submit"
				class="rounded-full bg-secondary px-4 py-2 text-xs font-medium text-dark"
				>Enregistrer</button
			>
			<button
				type="button"
				onclick={() => (editingId = null)}
				class="rounded-full bg-white px-4 py-2 text-xs text-dark-accent"
			>
				Annuler
			</button>
		</div>
	</form>
{/snippet}

<div class="mx-auto max-w-7xl">
	{#if viewMode === 'overview'}

		{#if data.talentDayEdition}
			<div class="mb-4 flex flex-col gap-2 rounded-2xl bg-secondary p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
				<div>
					<p class="text-xs font-medium text-dark/70">Talent Day</p>
					<p class="font-clash text-lg text-dark">
						{new Intl.DateTimeFormat('fr-BE', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(data.talentDayEdition.date))}
					</p>
				</div>
				<p class="font-clash text-2xl text-dark">
					{#if tdEditionPassed}Édition terminée{:else if talentDayDaysLeft === 0}Aujourd'hui{:else}J-{talentDayDaysLeft}{/if}
				</p>
			</div>
		{/if}

		<!-- Ce qu'il faut faire -->
		<div class="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
			<a href="/admin/joueurs" class="rounded-2xl border-l-4 border-l-amber-400 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
				<p class="text-xs font-medium text-dark-accent">Demandes à traiter</p>
				<p class="font-clash text-3xl text-dark">{toTreatCount}</p>
				<p class="mt-1 text-xs text-dark-accent">Accepter ou refuser →</p>
			</a>
			<a href="/admin/joueurs" class="rounded-2xl border-l-4 border-l-blue-500 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
				<p class="text-xs font-medium text-dark-accent">Acceptés — dossier à compléter</p>
				<p class="font-clash text-3xl text-dark">{dossierMissingCount}</p>
				<p class="mt-1 text-xs text-dark-accent">En attente du formulaire →</p>
			</a>
			<a href="/admin/joueurs" class="rounded-2xl border-l-4 border-l-green-500 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
				<p class="text-xs font-medium text-dark-accent">Joueurs acceptés (membres)</p>
				<p class="font-clash text-3xl text-dark">{memberCount}</p>
				<p class="mt-1 text-xs text-dark-accent">Dossier complet →</p>
			</a>
		</div>

		<!-- Par source -->
		<div class="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
			<div class="rounded-2xl bg-white p-5 shadow-sm">
				<div class="mb-4 flex items-center justify-between">
					<p class="font-clash text-sm text-dark">Talent Day</p>
					<a href="/admin?view=talent_days" class="text-xs text-dark-accent hover:text-dark">Voir la liste →</a>
				</div>
				<div class="mb-4 flex items-end gap-3">
					<p class="font-clash text-3xl text-dark">{tdUpcomingCount}</p>
					<p class="pb-1 text-xs text-dark-accent">inscrits pour la prochaine édition</p>
				</div>
				<div class="grid grid-cols-4 gap-2 rounded-xl bg-[#f4f5f7] p-3 text-center">
					<div><p class="font-clash text-lg text-dark">{tdAll.length}</p><p class="text-[11px] text-dark-accent">Inscrits</p></div>
					<div><p class="font-clash text-lg text-green-600">{presentCount}</p><p class="text-[11px] text-dark-accent">Venus</p></div>
					<div><p class="font-clash text-lg text-red-500">{absentCount}</p><p class="text-[11px] text-dark-accent">Pas venus</p></div>
					<div><p class="font-clash text-lg text-dark-accent">{unknownCount}</p><p class="text-[11px] text-dark-accent">Non renseignés</p></div>
				</div>
				<p class="mt-2 text-[11px] text-dark-accent">{tdArchived ? 'Édition précédente' : 'Édition en cours'}</p>
			</div>

			<div class="rounded-2xl bg-white p-5 shadow-sm">
				<div class="mb-4 flex items-center justify-between">
					<p class="font-clash text-sm text-dark">Faire un essai</p>
					<a href="/admin?view=academie" class="text-xs text-dark-accent hover:text-dark">Voir la liste →</a>
				</div>
				<div class="mb-4 flex items-end gap-3">
					<p class="font-clash text-3xl text-dark">{essaiAll.length}</p>
					<p class="pb-1 text-xs text-dark-accent">demandes au total</p>
				</div>
				<div class="grid grid-cols-3 gap-2 rounded-xl bg-[#f4f5f7] p-3 text-center">
					<div><p class="font-clash text-lg text-amber-600">{essaiAll.filter((p: any) => stageOfPlayer(p) === 'pending').length}</p><p class="text-[11px] text-dark-accent">À traiter</p></div>
					<div><p class="font-clash text-lg text-green-600">{essaiAll.filter((p: any) => p.status === 'accepted').length}</p><p class="text-[11px] text-dark-accent">Acceptés</p></div>
					<div><p class="font-clash text-lg text-red-500">{essaiAll.filter((p: any) => stageOfPlayer(p) === 'rejected').length}</p><p class="text-[11px] text-dark-accent">Refusés</p></div>
				</div>
			</div>
		</div>

		<div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
			<div class="rounded-2xl bg-white p-5 shadow-sm">
				<p class="font-clash mb-4 text-sm text-dark">Étapes des candidatures</p>
				{#each [['À traiter', toTreatCount, 'bg-amber-400'], ['Dossier à compléter', dossierMissingCount, 'bg-blue-500'], ['Membres (dossier complet)', memberCount, 'bg-green-500'], ['Pas venus (2 sem.)', absentHistoryCount, 'bg-gray-400'], ['Refusés', rejectedStageCount, 'bg-red-400']] as [label, n, color]}
					<div class="mb-3 last:mb-0">
						<div class="mb-1 flex justify-between text-xs text-dark-accent"><span>{label}</span><span>{n}</span></div>
						<div class="h-2 w-full overflow-hidden rounded-full bg-[#f4f5f7]">
							<div class="h-full rounded-full {color}" style="width: {pct(n as number, data.players.length)}%"></div>
						</div>
					</div>
				{/each}
			</div>

			<div class="rounded-2xl bg-white p-5 shadow-sm">
				<p class="font-clash mb-4 text-sm text-dark">Répartition par genre</p>
				<div class="mb-3">
					<div class="mb-1 flex justify-between text-xs text-dark-accent"><span>Femmes</span><span>{femaleCount}</span></div>
					<div class="h-2 w-full overflow-hidden rounded-full bg-[#f4f5f7]"><div class="h-full rounded-full bg-purple-400" style="width: {pct(femaleCount, genderKnownTotal)}%"></div></div>
				</div>
				<div>
					<div class="mb-1 flex justify-between text-xs text-dark-accent"><span>Hommes</span><span>{maleCount}</span></div>
					<div class="h-2 w-full overflow-hidden rounded-full bg-[#f4f5f7]"><div class="h-full rounded-full bg-blue-400" style="width: {pct(maleCount, genderKnownTotal)}%"></div></div>
				</div>
				<p class="mt-4 text-xs text-dark-accent">Total toutes demandes : {data.players.length}</p>
			</div>

			<div class="rounded-2xl bg-white p-5 shadow-sm">
				<p class="font-clash mb-4 text-sm text-dark">Dernières demandes</p>
				<div class="flex flex-col gap-3">
					{#each recentPlayers as player (player.id)}
						<a href={`/admin/joueurs?joueur=${player.id}`} class="flex items-center justify-between gap-2 rounded-lg hover:bg-[#f4f5f7]">
							<div class="flex items-center gap-2">
								<span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">{initials(player)}</span>
								<span class="truncate text-sm text-dark">{player.first_name} {player.last_name}</span>
							</div>
							<span class="shrink-0 rounded-full bg-[#f4f5f7] px-2 py-1 text-xs text-dark-accent">
								{player.type === 'talent_days' ? 'Talent Day' : 'Faire un essai'}
							</span>
						</a>
					{:else}
						<p class="text-xs text-dark-accent">Aucune demande pour le moment.</p>
					{/each}
				</div>
			</div>
		</div>
	{:else if viewMode === 'presences'}
		<div class="mb-4 flex w-fit max-w-full overflow-x-auto rounded-full bg-white p-1 shadow-sm">
			{#each [['jour', 'Séance du jour'], ['historique', 'Historique']] as [k, l]}
				<button type="button" onclick={() => (presMode = k as any)} class="whitespace-nowrap rounded-full px-5 py-2 text-sm font-medium {presMode === k ? 'bg-dark text-white' : 'text-dark-accent'}">{l}</button>
			{/each}
		</div>


		<!-- Filtres communs -->
		<div class="mb-4 flex flex-wrap items-center gap-3">
			<FilterMenu
				items={[
					{ label: 'Genre', value: psGender, def: 'all', options: [['all', 'Tous'], ['fille', 'Filles'], ['garcon', 'Garçons']], set: (v: string) => (psGender = v as any) },
					...(presMode === 'historique'
						? [{ label: 'Période', value: psPeriod, def: 'semaine', options: [['semaine', 'Semaine'], ['mois', 'Mois'], ['annee', 'Année']], set: (v: string) => (psPeriod = v as any) }]
						: [])
				]}
			/>
			{#if presMode === 'jour'}
				<input bind:value={psSearch} placeholder="Rechercher un joueur…" class="min-w-52 flex-1 rounded-xl border border-dark-accent/10 bg-white px-4 py-2 text-sm" />
			{/if}
		</div>

		{#if presMode === 'jour'}
			<!-- Choix de la date -->
			<div class="mb-4 flex flex-wrap items-center gap-3">
				<div class="flex w-full items-center justify-between gap-2 rounded-2xl bg-white p-1.5 shadow-sm sm:w-auto">
					<button type="button" onclick={() => psShiftDay(-1)} class="flex h-9 w-9 items-center justify-center rounded-xl text-dark-accent hover:bg-[#f4f5f7]" aria-label="Jour précédent">←</button>
					<div class="px-2 text-center">
						<p class="font-clash text-base capitalize text-dark">{fmtLong(presDate)}</p>
					</div>
					<button type="button" onclick={() => psShiftDay(1)} class="flex h-9 w-9 items-center justify-center rounded-xl text-dark-accent hover:bg-[#f4f5f7]" aria-label="Jour suivant">→</button>
				</div>
				<input type="date" bind:value={presDate} class="rounded-xl border border-dark-accent/10 bg-white px-3 py-2 text-sm" />
				<button type="button" onclick={() => (presDate = isoLocal(new Date()))} class="rounded-xl bg-white px-4 py-2 text-sm text-dark-accent shadow-sm hover:text-dark">Aujourd'hui</button>
				{#each psRecent as d}
					<button type="button" onclick={() => (presDate = d)} class="rounded-full px-3 py-1.5 text-xs font-medium {presDate === d ? 'bg-dark text-white' : 'bg-white text-dark-accent shadow-sm'}">{shortDate(d)}</button>
				{/each}
			</div>

			<!-- Compteurs de la séance -->
			<div class="mb-4 grid grid-cols-3 gap-4">
				<div class="rounded-2xl border-l-4 border-l-green-500 bg-white px-4 py-3 shadow-sm"><p class="text-xs text-dark-accent">Présents</p><p class="font-clash text-2xl text-green-700">{psDay.present}</p></div>
				<div class="rounded-2xl border-l-4 border-l-red-400 bg-white px-4 py-3 shadow-sm"><p class="text-xs text-dark-accent">Absents</p><p class="font-clash text-2xl text-red-600">{psDay.absent}</p></div>
				<div class="rounded-2xl border-l-4 border-l-gray-300 bg-white px-4 py-3 shadow-sm"><p class="text-xs text-dark-accent">À renseigner</p><p class="font-clash text-2xl text-dark">{psDay.unset}</p></div>
			</div>

			<div class="rounded-2xl bg-white p-5 shadow-sm">
				<!-- Actions en un clic pour tous les joueurs filtrés -->
				<div class="mb-4 flex flex-wrap gap-2">
					<form method="POST" action="?/savePresences" use:enhance={psKeep}>
						<input type="hidden" name="date" value={presDate} />
						{#each psPlayers as p (p.id)}<input type="hidden" name={`s_${p.id}`} value="present" />{/each}
						<button class="rounded-xl bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700">✓ Tous présents</button>
					</form>
					<form method="POST" action="?/savePresences" use:enhance={psKeep}>
						<input type="hidden" name="date" value={presDate} />
						{#each psPlayers as p (p.id)}<input type="hidden" name={`s_${p.id}`} value="absent" />{/each}
						<button class="rounded-xl bg-[#f4f5f7] px-4 py-2 text-sm font-medium text-dark-accent hover:bg-red-50 hover:text-red-600">✕ Tous absents</button>
					</form>
					<form method="POST" action="?/savePresences" use:enhance={psKeep}>
						<input type="hidden" name="date" value={presDate} />
						{#each psPlayers as p (p.id)}<input type="hidden" name={`s_${p.id}`} value="clear" />{/each}
						<button class="rounded-xl bg-[#f4f5f7] px-4 py-2 text-sm font-medium text-dark-accent hover:bg-[#eceef1]">↺ Tout effacer</button>
					</form>
				</div>

				<div class="flex flex-col gap-2">
					{#each psPaged as p (p.id)}
						{@const st = p.presences?.[presDate] ?? ''}
						<div class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border-l-4 px-4 py-2 {st === 'present' ? 'border-l-green-500 bg-green-50/60' : st === 'absent' ? 'border-l-red-400 bg-red-50/60' : 'border-l-gray-300 bg-[#f4f5f7]/60'}">
							<div class="flex min-w-0 items-center gap-3">
								<span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-dark text-xs font-semibold text-white">{initials(p)}</span>
								<div class="min-w-0">
									<p class="truncate font-medium text-dark">{p.first_name} {p.last_name}</p>
									<div class="mt-0.5 flex items-center gap-1" title="5 dernières séances">
										{#each psLast(p) as v}
											<span class="h-2 w-2 rounded-full {v === 'present' ? 'bg-green-500' : v === 'absent' ? 'bg-red-400' : 'bg-gray-300'}"></span>
										{/each}
									</div>
								</div>
							</div>
							<form method="POST" action="?/savePresences" use:enhance={psKeep} class="flex w-full gap-1.5 sm:w-auto">
								<input type="hidden" name="date" value={presDate} />
								<button name={`s_${p.id}`} value={st === 'present' ? 'clear' : 'present'} title={st === 'present' ? 'Annuler' : undefined} class="flex-1 rounded-xl px-5 py-2.5 text-sm font-medium transition-colors sm:flex-none {st === 'present' ? 'bg-green-600 text-white shadow-sm' : 'bg-white text-dark-accent ring-1 ring-dark-accent/10 hover:bg-green-50 hover:text-green-700'}">{st === 'present' ? '✓ Présent  ✕' : '✓ Présent'}</button>
								<button name={`s_${p.id}`} value={st === 'absent' ? 'clear' : 'absent'} title={st === 'absent' ? 'Annuler' : undefined} class="flex-1 rounded-xl px-5 py-2.5 text-sm font-medium transition-colors sm:flex-none {st === 'absent' ? 'bg-red-500 text-white shadow-sm' : 'bg-white text-dark-accent ring-1 ring-dark-accent/10 hover:bg-red-50 hover:text-red-600'}">{st === 'absent' ? '✕ Absent  ✕' : '✕ Absent'}</button>
							</form>
						</div>
					{:else}
						<p class="rounded-xl bg-[#f4f5f7] px-4 py-6 text-center text-sm text-dark-accent">Aucun joueur.</p>
					{/each}
				</div>

				{#if psPageCount > 1}
					<div class="mt-4 flex items-center justify-between text-sm text-dark-accent">
						<span>{(psPage - 1) * PS_SIZE + 1}–{Math.min(psPage * PS_SIZE, psPlayers.length)} sur {psPlayers.length}</span>
						<div class="flex gap-1">
							<button disabled={psPage === 1} onclick={() => psPage--} class="rounded-lg bg-[#f4f5f7] px-3 py-1.5 disabled:opacity-40">←</button>
							{#each Array(psPageCount) as _, i}
								<button onclick={() => (psPage = i + 1)} class="rounded-lg px-3 py-1.5 {psPage === i + 1 ? 'bg-dark text-white' : 'bg-[#f4f5f7]'}">{i + 1}</button>
							{/each}
							<button disabled={psPage === psPageCount} onclick={() => psPage++} class="rounded-lg bg-[#f4f5f7] px-3 py-1.5 disabled:opacity-40">→</button>
						</div>
					</div>
				{/if}
			</div>
		{:else}
			<!-- Historique : semaine / mois / année -->
			<div class="mb-4 flex flex-wrap items-center gap-3">
				
				<div class="flex w-full items-center gap-2 rounded-2xl bg-white p-1.5 shadow-sm sm:w-auto">
					<button type="button" onclick={() => psShiftPeriod(-1)} class="flex h-9 w-9 items-center justify-center rounded-xl text-dark-accent hover:bg-[#f4f5f7]" aria-label="Période précédente">←</button>
					<span class="font-clash min-w-0 flex-1 px-1 text-center text-sm text-dark sm:min-w-56 sm:text-base">{psRange.label}</span>
					<button type="button" onclick={() => psShiftPeriod(1)} class="flex h-9 w-9 items-center justify-center rounded-xl text-dark-accent hover:bg-[#f4f5f7]" aria-label="Période suivante">→</button>
				</div>
				<button type="button" onclick={() => (psRef = new Date())} class="rounded-xl bg-white px-4 py-2 text-sm text-dark-accent shadow-sm hover:text-dark">Aujourd'hui</button>
			</div>

			<!-- Résumé compact : diagramme + graphique côte à côte -->
			<div class="mb-4 grid gap-4 lg:grid-cols-[320px_1fr]">
				<div class="flex items-center gap-5 rounded-2xl bg-white p-5 shadow-sm">
					<div class="relative h-28 w-28 shrink-0">
						<svg viewBox="0 0 100 100" class="h-full w-full -rotate-90">
							<circle cx="50" cy="50" r="40" fill="none" stroke="#fee2e2" stroke-width="14" />
							<circle cx="50" cy="50" r="40" fill="none" stroke="#22c55e" stroke-width="14" stroke-linecap="round"
								stroke-dasharray="{(psTotalRate ?? 0) * 2.513} 251.3" />
						</svg>
						<div class="absolute inset-0 flex flex-col items-center justify-center">
							<span class="font-clash text-2xl text-dark">{psTotalRate === null ? '—' : `${psTotalRate}%`}</span>
							<span class="text-[10px] text-dark-accent">présence</span>
						</div>
					</div>
					<div class="space-y-2 text-sm">
						<p class="flex items-center gap-2"><span class="h-2.5 w-2.5 rounded-full bg-green-500"></span><b class="text-dark">{psTotalPresent}</b> <span class="text-dark-accent">présences</span></p>
						<p class="flex items-center gap-2"><span class="h-2.5 w-2.5 rounded-full bg-red-200"></span><b class="text-dark">{psTotalAll - psTotalPresent}</b> <span class="text-dark-accent">absences</span></p>
						<p class="text-xs text-dark-accent">{psSessions.length} séance(s) · {psHistRows.length} joueurs</p>
					</div>
				</div>

				<div class="rounded-2xl bg-white p-5 shadow-sm">
					{#if psBars.length === 0 || psBars.every((b: any) => b.total === 0)}
						<div class="flex h-28 items-center justify-center text-sm text-dark-accent">Aucune séance sur cette période.</div>
					{:else}
						{@const max = Math.max(1, ...psBars.map((b: any) => Math.max(b.value, b.total)))}
						<div class="flex h-32 items-end gap-2">
							{#each psBars as b}
								<div class="flex min-w-0 flex-1 flex-col items-center justify-end gap-1" title="{b.value} présents sur {b.total}">
									<span class="text-[11px] font-medium text-dark">{b.value}</span>
									<div class="flex w-full max-w-10 flex-col justify-end overflow-hidden rounded-t-md bg-red-100" style="height: {Math.max(4, (Math.max(b.total, b.value) / max) * 80)}px">
										<div class="w-full bg-green-500" style="height: {b.total ? (b.value / Math.max(b.total, b.value)) * 100 : 0}%"></div>
									</div>
									<span class="truncate text-[10px] text-dark-accent">{b.label}</span>
								</div>
							{/each}
						</div>
					{/if}
				</div>
			</div>

			<div class="rounded-2xl bg-white p-5 shadow-sm">
				<div class="overflow-x-auto">
					<table class="w-full text-left text-sm">
						<thead class="border-b border-dark-accent/10 text-xs text-dark-accent">
							<tr>
								<th class="sticky left-0 bg-white px-3 py-3 uppercase">Joueur</th>
								{#if psPeriod === 'annee'}
									{#each psMonths as m, i}<th class="px-2 py-3 text-center font-medium">{MONTH_LABELS[i].slice(0, 3)}</th>{/each}
								{:else}
									{#each psSessions as d}<th class="whitespace-nowrap px-2 py-3 text-center font-medium">{shortDate(d)}</th>{/each}
								{/if}
								<th class="px-3 py-3 text-right uppercase">Taux</th>
							</tr>
						</thead>
						<tbody>
							{#each psHistPaged as r (r.p.id)}
								<tr class="border-b border-dark-accent/5 last:border-0">
									<td class="sticky left-0 whitespace-nowrap bg-white px-3 py-2 font-medium text-dark">{r.p.first_name} {r.p.last_name}</td>
									{#if psPeriod === 'annee'}
										{#each r.months as c}
											<td class="px-1 py-2 text-center">
												<span class="inline-flex min-w-9 justify-center rounded-lg px-1.5 py-1 text-xs font-medium {rateTone(c.rate)}" title="{c.pr} / {c.tot}">{c.rate === null ? '·' : `${c.rate}%`}</span>
											</td>
										{/each}
									{:else}
										{#each r.inRange as v}
											<td class="px-2 py-2 text-center">
												{#if v === 'present'}<span class="inline-flex h-7 w-7 items-center justify-center rounded-full bg-green-100 text-xs text-green-700">✓</span>
												{:else if v === 'absent'}<span class="inline-flex h-7 w-7 items-center justify-center rounded-full bg-red-100 text-xs text-red-600">✕</span>
												{:else}<span class="text-dark-accent/30">·</span>{/if}
											</td>
										{/each}
									{/if}
									<td class="px-3 py-2 text-right"><span class="rounded-full px-3 py-1 text-xs font-semibold {rateTone(r.rate)}">{r.rate === null ? '—' : `${r.rate}%`}</span></td>
								</tr>
							{:else}
								<tr><td class="px-3 py-8 text-center text-dark-accent">Aucun joueur.</td></tr>
							{/each}
						</tbody>
					</table>
				</div>
				{#if psPeriod !== 'annee' && psSessions.length === 0}
					<p class="mt-4 rounded-xl bg-[#f4f5f7] px-4 py-3 text-center text-sm text-dark-accent">Aucune séance sur cette période.</p>
				{/if}
				{#if psHistPageCount > 1}
					<div class="mt-4 flex items-center justify-between text-sm text-dark-accent">
						<span>{(psHistPage - 1) * PS_SIZE + 1}–{Math.min(psHistPage * PS_SIZE, psHistRows.length)} sur {psHistRows.length}</span>
						<div class="flex gap-1">
							<button disabled={psHistPage === 1} onclick={() => psHistPage--} class="rounded-lg bg-[#f4f5f7] px-3 py-1.5 disabled:opacity-40">←</button>
							{#each Array(psHistPageCount) as _, i}
								<button onclick={() => (psHistPage = i + 1)} class="rounded-lg px-3 py-1.5 {psHistPage === i + 1 ? 'bg-dark text-white' : 'bg-[#f4f5f7]'}">{i + 1}</button>
							{/each}
							<button disabled={psHistPage === psHistPageCount} onclick={() => psHistPage++} class="rounded-lg bg-[#f4f5f7] px-3 py-1.5 disabled:opacity-40">→</button>
						</div>
					</div>
				{/if}
			</div>
		{/if}
	{:else if viewMode === 'paiements'}
		<div class="mb-4 flex w-fit max-w-full overflow-x-auto rounded-full bg-white p-1 shadow-sm">
			{#each [['mois', 'Par mois'], ['annee', 'Année']] as [k, l]}
				<button type="button" onclick={() => (payMode = k as any)} class="whitespace-nowrap rounded-full px-5 py-2 text-sm font-medium {payMode === k ? 'bg-dark text-white' : 'text-dark-accent'}">{l}</button>
			{/each}
		</div>
	{#if payMode === 'mois'}
		<!-- Sélecteur de mois -->
		<div class="mb-4 flex flex-wrap items-center justify-between gap-3">
			<div class="flex items-center gap-2 rounded-2xl bg-white p-1.5 shadow-sm">
				<button type="button" onclick={() => shiftPayMonth(-1)} class="flex h-9 w-9 items-center justify-center rounded-xl text-dark-accent hover:bg-[#f4f5f7]" aria-label="Mois précédent">←</button>
				<span class="font-clash min-w-32 flex-1 text-center text-base text-dark sm:min-w-40">{monthLabel(payMonth)}</span>
				<button type="button" onclick={() => shiftPayMonth(1)} class="flex h-9 w-9 items-center justify-center rounded-xl text-dark-accent hover:bg-[#f4f5f7]" aria-label="Mois suivant">→</button>
			</div>
			{#if payMonth !== currentMonth}
				<button type="button" onclick={() => (payMonth = currentMonth)} class="rounded-xl bg-white px-4 py-2 text-sm text-dark-accent shadow-sm hover:text-dark">Revenir au mois en cours</button>
			{/if}
		</div>

		<!-- Résumé du mois -->
		<div class="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
			<div class="rounded-2xl border-l-4 border-l-green-500 bg-white p-5 shadow-sm">
				<p class="text-xs font-medium text-dark-accent">Encaissé ce mois</p>
				<p class="font-clash text-2xl text-dark">{payCollected} €</p>
			</div>
			<div class="rounded-2xl border-l-4 border-l-amber-400 bg-white p-5 shadow-sm">
				<p class="text-xs font-medium text-dark-accent">Reste à encaisser</p>
				<p class="font-clash text-2xl text-dark">{payExpected - payCollected} €</p>
				<p class="text-xs text-dark-accent">sur {payExpected} € attendus</p>
			</div>
			<div class="rounded-2xl border-l-4 border-l-blue-500 bg-white p-5 shadow-sm">
				<p class="text-xs font-medium text-dark-accent">Mensualités payées</p>
				<p class="font-clash text-2xl text-dark">{payPaidCount} / {payRows.length}</p>
				<div class="mt-2 h-1.5 overflow-hidden rounded-full bg-[#f4f5f7]">
					<div class="h-full rounded-full bg-blue-500" style="width: {pct(payPaidCount, payRows.length)}%"></div>
				</div>
			</div>
			<div class="rounded-2xl border-l-4 border-l-purple-400 bg-white p-5 shadow-sm">
				<p class="text-xs font-medium text-dark-accent">Cotisations annuelles ({FEES.annual} €)</p>
				<p class="font-clash text-2xl text-dark">{payAnnualCount} / {payRows.length}</p>
				<p class="text-xs text-dark-accent">Total encaissé tous mois : {totalCollected} €</p>
			</div>
		</div>

		<div class="rounded-2xl bg-white p-5 shadow-sm">

			<div class="mb-4 flex flex-wrap items-center gap-3">
				<select bind:value={payFilter} class="rounded-xl border border-dark-accent/10 bg-white px-4 py-2 text-sm text-dark shadow-sm">
					<option value="all">Tous ({payRows.length})</option>
					<option value="unpaid">Impayés ({payRows.length - payPaidCount})</option>
					<option value="paid">Payés ({payPaidCount})</option>
				</select>
				<label class="flex items-center gap-2 rounded-xl border border-dark-accent/10 bg-white px-3 py-1.5 text-xs text-dark-accent shadow-sm">Date du paiement<input type="date" bind:value={payDateSel} class="rounded-lg bg-[#f4f5f7] px-2 py-1 text-sm text-dark" /></label>
				<input bind:value={paySearch} placeholder="Rechercher un joueur…" class="min-w-52 flex-1 rounded-xl border border-dark-accent/10 bg-[#f4f5f7] px-4 py-2 text-sm" />
			</div>

			{#if memberPlayers.length === 0}
				<p class="rounded-xl bg-[#f4f5f7] px-4 py-3 text-sm text-dark-accent">Aucun joueur n'a encore complété son dossier.</p>
			{:else}
				<div class="overflow-x-auto">
					<table class="w-full text-left text-sm">
						<thead class="border-b border-dark-accent/10 text-xs uppercase text-dark-accent">
							<tr>
								<th class="px-3 py-3">Joueur</th>
								<th class="px-3 py-3">Mensualité {monthLabel(payMonth)}</th>
								<th class="px-3 py-3">Cotisation annuelle {new Date().getFullYear()}</th>
								<th class="hidden px-3 py-3 lg:table-cell">Total versé</th>
							</tr>
						</thead>
						<tbody>
							{#each payPaged as r (r.p.id)}
								<tr class="border-b border-dark-accent/5 last:border-0">
									<td class="border-l-4 px-3 py-3 {r.month ? 'border-l-green-500' : 'border-l-amber-400'}">
										<div class="flex items-center gap-3">
											<span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">{initials(r.p)}</span>
											<div>
												<p class="font-medium text-dark">{r.p.first_name} {r.p.last_name}</p>
												<p class="text-xs text-dark-accent">{r.fee} € / mois</p>
											</div>
										</div>
									</td>
									<td class="px-3 py-3">
										<form method="POST" action={r.month ? '?/deletePayment' : '?/savePayments'} use:enhance class="flex items-center gap-3">
											<input type="hidden" name="id" value={r.p.id} />
											{#if r.month}
												<input type="hidden" name="entry" value={r.month.id} />
											{:else}
												<input type="hidden" name="paid" value={r.p.id} />
												<input type="hidden" name="type" value="mensuel" />
												<input type="hidden" name="mois" value={payMonth} />
												<input type="hidden" name="date" value={payDateSel} />
											{/if}
											<input
												type="checkbox"
												checked={!!r.month}
												onchange={(e) => {
													if (r.month && !confirm('Annuler ce paiement ?')) { e.currentTarget.checked = true; return; }
													e.currentTarget.form?.requestSubmit();
												}}
												class="h-5 w-5 cursor-pointer accent-green-600"
												aria-label="Mensualité {monthLabel(payMonth)} payée"
											/>
											{#if r.month}
												<span class="text-xs"><b class="text-green-700">Payé · {r.month.montant} €</b><br /><span class="text-dark-accent">le {new Date(r.month.date).toLocaleDateString('fr-BE')}</span></span>
											{:else}
												<span class="text-xs text-amber-700">À payer · {r.fee} €</span>
											{/if}
										</form>
										<div class="mt-1 flex flex-wrap items-center gap-2 text-xs">
											{#if r.month}
												{#if r.month.note}<span class="rounded bg-yellow-50 px-2 py-0.5 text-yellow-800">📝 {r.month.note}</span>{/if}
												<button type="button" onclick={() => (payEditId = payEditId === r.p.id ? null : r.p.id)} class="text-primary underline">Date / note</button>
											{:else if payMonth <= currentMonth}
												<form method="POST" action="?/sendPaymentReminder" use:enhance={remindEnhance(`${r.p.first_name} ${r.p.last_name}`)}>
													<input type="hidden" name="id" value={r.p.id} />
													<input type="hidden" name="mois" value={payMonth} />
													<button class="rounded-lg bg-amber-100 px-2.5 py-1 font-medium text-amber-800 hover:bg-amber-200">✉ Rappel email</button>
												</form>
												{#if r.rappel}<span class="text-dark-accent">Rappel envoyé le {new Date(r.rappel.date).toLocaleDateString('fr-BE')}</span>{/if}
											{/if}
										</div>
										{#if payEditId === r.p.id && r.month}
											<form method="POST" action="?/updatePayment" use:enhance={() => async ({ result, update }) => {
												if (result.type === 'failure') alert(String((result.data as any)?.error ?? 'Erreur'));
												else payEditId = null;
												await update({ reset: false });
											}} class="mt-2 flex flex-col gap-2 rounded-xl bg-[#f4f5f7] p-3">
												<input type="hidden" name="id" value={r.p.id} />
												<input type="hidden" name="entry" value={r.month.id} />
												<label class="text-xs text-dark-accent">Date du paiement
													<input type="date" name="date" required value={String(r.month.date).slice(0, 10)} class="mt-1 block rounded-lg border border-dark-accent/15 bg-white px-2 py-1.5 text-sm text-dark" />
												</label>
												<label class="text-xs text-dark-accent">Note / remarque
													<textarea name="note" rows="2" placeholder="Ex. payé en cash, paiera le reste vendredi…" class="mt-1 block w-full rounded-lg border border-dark-accent/15 bg-white px-2 py-1.5 text-sm text-dark">{r.month.note ?? ''}</textarea>
												</label>
												<div class="flex gap-2">
													<button class="rounded-lg bg-dark px-3 py-1.5 text-xs font-medium text-white">Enregistrer</button>
													<button type="button" onclick={() => (payEditId = null)} class="rounded-lg bg-white px-3 py-1.5 text-xs text-dark-accent">Annuler</button>
												</div>
											</form>
										{/if}
									</td>
									<td class="px-3 py-3">
										<form method="POST" action={r.annual ? '?/deletePayment' : '?/savePayments'} use:enhance class="flex items-center gap-3">
											<input type="hidden" name="id" value={r.p.id} />
											{#if r.annual}
												<input type="hidden" name="entry" value={r.annual.id} />
											{:else}
												<input type="hidden" name="paid" value={r.p.id} />
												<input type="hidden" name="type" value="annuel" />
												<input type="hidden" name="date" value={payDateSel} />
											{/if}
											<input
												type="checkbox"
												checked={!!r.annual}
												onchange={(e) => {
													if (r.annual && !confirm('Annuler la cotisation annuelle ?')) { e.currentTarget.checked = true; return; }
													e.currentTarget.form?.requestSubmit();
												}}
												class="h-5 w-5 cursor-pointer accent-purple-600"
												aria-label="Cotisation annuelle payée"
											/>
											{#if r.annual}
												<span class="text-xs"><b class="text-green-700">Payée · {r.annual.montant} €</b><br /><span class="text-dark-accent">le {new Date(r.annual.date).toLocaleDateString('fr-BE')}</span></span>
											{:else}
												<span class="text-xs text-dark-accent">Non payée</span>
											{/if}
										</form>
									</td>
									<td class="hidden px-3 py-3 text-dark lg:table-cell">{payTotal(r.p)} €</td>
								</tr>
							{:else}
								<tr><td colspan="4" class="px-3 py-8 text-center text-dark-accent">Aucun joueur.</td></tr>
							{/each}
						</tbody>
					</table>
				</div>

				{#if payPageCount > 1}
					<div class="mt-4 flex items-center justify-between text-sm text-dark-accent">
						<span>{(payPage - 1) * PAY_SIZE + 1}–{Math.min(payPage * PAY_SIZE, payFiltered.length)} sur {payFiltered.length}</span>
						<div class="flex gap-1">
							<button disabled={payPage === 1} onclick={() => payPage--} class="rounded-lg bg-[#f4f5f7] px-3 py-1.5 disabled:opacity-40">←</button>
							{#each Array(payPageCount) as _, i}
								<button onclick={() => (payPage = i + 1)} class="rounded-lg px-3 py-1.5 {payPage === i + 1 ? 'bg-dark text-white' : 'bg-[#f4f5f7]'}">{i + 1}</button>
							{/each}
							<button disabled={payPage === payPageCount} onclick={() => payPage++} class="rounded-lg bg-[#f4f5f7] px-3 py-1.5 disabled:opacity-40">→</button>
						</div>
					</div>
				{/if}
			{/if}
		</div>
	{:else}
		<div class="mb-4 flex items-center gap-2 rounded-2xl bg-white p-1.5 shadow-sm w-fit">
			<button type="button" onclick={() => histYear--} class="flex h-9 w-9 items-center justify-center rounded-xl text-dark-accent hover:bg-[#f4f5f7]" aria-label="Année précédente">←</button>
			<span class="font-clash min-w-24 text-center text-base text-dark">{histYear}</span>
			<button type="button" onclick={() => histYear++} class="flex h-9 w-9 items-center justify-center rounded-xl text-dark-accent hover:bg-[#f4f5f7]" aria-label="Année suivante">→</button>
		</div>
		<div class="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-3">
			<div class="rounded-2xl border-l-4 border-l-green-500 bg-white p-5 shadow-sm"><p class="text-xs font-medium text-dark-accent">Encaissé en {histYear}</p><p class="font-clash text-2xl text-dark">{yearTotal} €</p></div>
			<div class="rounded-2xl border-l-4 border-l-blue-500 bg-white p-5 shadow-sm"><p class="text-xs font-medium text-dark-accent">Mensualités payées</p><p class="font-clash text-2xl text-dark">{yearMonthTotals.reduce((a: number, b: number) => a + b, 0)}</p></div>
			<div class="rounded-2xl border-l-4 border-l-purple-400 bg-white p-5 shadow-sm"><p class="text-xs font-medium text-dark-accent">Cotisations annuelles</p><p class="font-clash text-2xl text-dark">{yearRows.filter((r: any) => r.annual).length} / {yearRows.length}</p></div>
		</div>
		<div class="rounded-2xl bg-white p-5 shadow-sm">
			<div class="overflow-x-auto">
				<table class="w-full text-left text-sm">
					<thead class="border-b border-dark-accent/10 text-xs text-dark-accent">
						<tr>
							<th class="sticky left-0 bg-white px-3 py-3 uppercase">Joueur</th>
							{#each histMonths as k}
								<th class="px-2 py-3 text-center font-medium">{MONTH_LABELS[Number(k.slice(5)) - 1].slice(0, 3)}</th>
							{/each}
							<th class="px-3 py-3 text-center uppercase">Annuelle</th>
							<th class="px-3 py-3 text-right uppercase">Total</th>
						</tr>
					</thead>
					<tbody>
						{#each yearPaged as r (r.p.id)}
							<tr class="border-b border-dark-accent/5">
								<td class="sticky left-0 whitespace-nowrap bg-white px-3 py-3 font-medium text-dark">{r.p.first_name} {r.p.last_name}</td>
								{#each r.cells as c, i}
									<td class="px-2 py-3 text-center">
										{#if c}<span class="inline-flex h-6 w-6 items-center justify-center rounded-full bg-green-100 text-xs text-green-700" title="{c.montant} € · {new Date(c.date).toLocaleDateString('fr-BE')}">✓</span>
										{:else if histMonths[i] < currentMonth}<span class="inline-flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-xs text-amber-700" title="Impayé">!</span>
										{:else}<span class="text-dark-accent/30">·</span>{/if}
									</td>
								{/each}
								<td class="px-3 py-3 text-center">{#if r.annual}<span class="inline-flex h-6 w-6 items-center justify-center rounded-full bg-purple-100 text-xs text-purple-700" title="{r.annual.montant} €">✓</span>{:else}<span class="text-dark-accent/30">·</span>{/if}</td>
								<td class="px-3 py-3 text-right font-medium text-dark">{r.total} €</td>
							</tr>
						{:else}
							<tr><td class="px-3 py-8 text-center text-dark-accent">Aucun joueur.</td></tr>
						{/each}
					</tbody>
					<tfoot class="border-t border-dark-accent/10 text-xs text-dark-accent">
						<tr>
							<td class="sticky left-0 bg-white px-3 py-3 font-medium">Payés / mois</td>
							{#each yearMonthTotals as n}<td class="px-2 py-3 text-center">{n}</td>{/each}
							<td></td><td class="px-3 py-3 text-right font-semibold text-dark">{yearTotal} €</td>
						</tr>
					</tfoot>
				</table>
			</div>
			{#if yearPageCount > 1}
				<div class="mt-4 flex items-center justify-between text-sm text-dark-accent">
					<span>{(histPayPage - 1) * 10 + 1}–{Math.min(histPayPage * 10, yearRows.length)} sur {yearRows.length}</span>
					<div class="flex gap-1">
						<button disabled={histPayPage === 1} onclick={() => histPayPage--} class="rounded-lg bg-[#f4f5f7] px-3 py-1.5 disabled:opacity-40">←</button>
						{#each Array(yearPageCount) as _, i}
							<button onclick={() => (histPayPage = i + 1)} class="rounded-lg px-3 py-1.5 {histPayPage === i + 1 ? 'bg-dark text-white' : 'bg-[#f4f5f7]'}">{i + 1}</button>
						{/each}
						<button disabled={histPayPage === yearPageCount} onclick={() => histPayPage++} class="rounded-lg bg-[#f4f5f7] px-3 py-1.5 disabled:opacity-40">→</button>
					</div>
				</div>
			{/if}
		</div>
	{/if}
	{:else if viewMode === 'stats'}
		<div class="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
			<div class="rounded-2xl border-l-4 border-l-blue-500 bg-white px-4 py-3 shadow-sm"><p class="text-xs text-dark-accent">Joueurs</p><p class="font-clash text-2xl text-dark">{statsPlayers.length}</p></div>
			<div class="rounded-2xl border-l-4 border-l-green-500 bg-white px-4 py-3 shadow-sm"><p class="text-xs text-dark-accent">Buts</p><p class="font-clash text-2xl text-dark">{statsGoals}</p></div>
			<div class="rounded-2xl border-l-4 border-l-purple-400 bg-white px-4 py-3 shadow-sm"><p class="text-xs text-dark-accent">Passes décisives</p><p class="font-clash text-2xl text-dark">{statsAssists}</p></div>
			<div class="rounded-2xl border-l-4 border-l-gray-300 bg-white px-4 py-3 shadow-sm"><p class="text-xs text-dark-accent">Hors site (privé)</p><p class="font-clash text-2xl text-dark">{statsMissing}</p></div>
		</div>

		<div class="mb-4 flex flex-wrap items-center gap-3">
			<select bind:value={genderFilter} class="rounded-xl border border-dark-accent/10 bg-white px-4 py-2 text-sm text-dark shadow-sm">
				<option value="all">Tous</option>
				<option value="fille">Filles</option>
				<option value="garcon">Garçons</option>
			</select>
			<input type="search" bind:value={statsSearch} placeholder="Rechercher un joueur…" aria-label="Rechercher un joueur" class="min-w-52 flex-1 rounded-xl border border-dark-accent/10 bg-white px-4 py-2 text-sm" />
		</div>

		<div class="flex flex-col gap-2">
			{#each statsPaged as player (player.id)}
				{@const sp = player.siteProfile ?? player.stats ?? {}}
				{@const footVal = sp.foot ?? ({ droit: 'droit', gauche: 'gauche', les_deux: 'les deux' } as Record<string, string>)[player.dossier?.pied] ?? ''}
				{@const heightVal = sp.height ?? player.dossier?.taille ?? ''}
					<form
						method="POST"
						action="?/updateStats"
						use:enhance={() => {
							return async ({ result, update }) => {
								await update({ reset: false });
								if (result.type === 'success') {
									savedId = player.id;
									setTimeout(() => (savedId = null), 2000);
								}
							};
						}}
						class="grid grid-cols-2 items-end gap-3 rounded-2xl border-l-4 {player.siteProfile ? 'border-l-purple-400' : 'border-l-gray-300'} bg-white px-4 py-2.5 shadow-sm md:grid-cols-[1.6fr_repeat(5,1fr)_auto]"
					>
						<input type="hidden" name="profile_id" value={player.siteProfile?.id ?? ''} />
						<input type="hidden" name="id" value={player.id} />
						<div class="col-span-2 flex items-center gap-3 md:col-span-1">
							<span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-dark text-xs font-semibold text-white">{initials(player)}</span>
							<div class="min-w-0">
								<p class="truncate font-medium text-dark">{player.first_name} {player.last_name}</p>
								<p class="truncate text-xs text-dark-accent">{player.preferred_position}{player.siteProfile ? '' : ' · privé'}</p>
							</div>
						</div>
						<label class="text-[11px] text-dark-accent">Taille (cm)
							<input type="number" name="height" min="100" max="230" value={heightVal} class="mt-0.5 w-full rounded-lg border border-dark-accent/15 bg-[#f4f5f7] px-2.5 py-1.5 text-sm text-dark" />
						</label>
						<label class="text-[11px] text-dark-accent">Pied fort
							<select name="foot" value={footVal} class="mt-0.5 w-full rounded-lg border border-dark-accent/15 bg-[#f4f5f7] px-2.5 py-1.5 text-sm text-dark">
								<option value="">—</option>
								<option value="droit">Droit</option>
								<option value="gauche">Gauche</option>
								<option value="les deux">Les deux</option>
								{#if footVal && !['droit', 'gauche', 'les deux'].includes(footVal)}
									<option value={footVal}>{footVal}</option>
								{/if}
							</select>
						</label>
						<label class="text-[11px] text-dark-accent">Matchs
							<input type="number" name="games" min="0" value={sp.games ?? ''} class="mt-0.5 w-full rounded-lg border border-dark-accent/15 bg-[#f4f5f7] px-2.5 py-1.5 text-sm text-dark" />
						</label>
						<label class="text-[11px] text-dark-accent">Buts
							<input type="number" name="goals" min="0" value={sp.goals ?? ''} class="mt-0.5 w-full rounded-lg border border-dark-accent/15 bg-[#f4f5f7] px-2.5 py-1.5 text-sm text-dark" />
						</label>
						<label class="text-[11px] text-dark-accent">Passes
							<input type="number" name="assists" min="0" value={sp.assists ?? ''} class="mt-0.5 w-full rounded-lg border border-dark-accent/15 bg-[#f4f5f7] px-2.5 py-1.5 text-sm text-dark" />
						</label>
						<button type="submit" class="col-span-2 rounded-xl px-4 py-2 text-xs font-medium md:col-span-1 {savedId === player.id ? 'bg-green-600 text-white' : 'bg-dark text-white hover:opacity-90'}">
							{savedId === player.id ? 'Enregistré ✓' : 'Enregistrer'}
						</button>
					</form>
			{:else}
				<p class="rounded-2xl bg-white px-4 py-8 text-center text-sm text-dark-accent shadow-sm">Aucun joueur.</p>
			{/each}
		</div>

		{#if statsPageCount > 1}
			<div class="mt-4 flex items-center justify-between text-sm text-dark-accent">
				<span>{(statsPage - 1) * 10 + 1}–{Math.min(statsPage * 10, statsPlayers.length)} sur {statsPlayers.length}</span>
				<div class="flex gap-1">
					<button disabled={statsPage === 1} onclick={() => statsPage--} class="rounded-lg bg-white px-3 py-1.5 disabled:opacity-40">←</button>
					{#each Array(statsPageCount) as _, i}
						<button onclick={() => (statsPage = i + 1)} class="rounded-lg px-3 py-1.5 {statsPage === i + 1 ? 'bg-dark text-white' : 'bg-white'}">{i + 1}</button>
					{/each}
					<button disabled={statsPage === statsPageCount} onclick={() => statsPage++} class="rounded-lg bg-white px-3 py-1.5 disabled:opacity-40">→</button>
				</div>
			</div>
		{/if}
	{:else}
		<div class="print:bg-transparent">
			<div class="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4 print:hidden">
				<div class="rounded-2xl border-l-4 border-l-blue-500 bg-white px-4 py-3 shadow-sm"><p class="text-xs text-dark-accent">Inscrits</p><p class="font-clash text-2xl text-dark">{lsCounts.total}</p></div>
				<div class="rounded-2xl border-l-4 border-l-amber-400 bg-white px-4 py-3 shadow-sm"><p class="text-xs text-dark-accent">À traiter</p><p class="font-clash text-2xl text-dark">{lsCounts.pending}</p></div>
				<div class="rounded-2xl border-l-4 border-l-green-500 bg-white px-4 py-3 shadow-sm"><p class="text-xs text-dark-accent">Venus</p><p class="font-clash text-2xl text-green-700">{lsCounts.venu}</p></div>
				<div class="rounded-2xl border-l-4 border-l-red-400 bg-white px-4 py-3 shadow-sm"><p class="text-xs text-dark-accent">Pas venus</p><p class="font-clash text-2xl text-red-600">{lsCounts.pasVenu}</p></div>
			</div>

			<div class="mb-4 flex flex-col gap-3 print:hidden">
				<div class="flex flex-wrap items-center gap-3">
					<FilterMenu
						items={[
							...(viewMode === 'talent_days'
								? [{ label: 'Édition', value: tdTab, def: 'current', options: [['current', 'Édition en cours'], ['history', 'Historique']], set: (v: string) => (tdTab = v as any) }]
								: []),
							{ label: 'Statut', value: lsStatus, def: 'all', options: [['all', 'Tous', lsCounts.total], ['pending', 'À traiter', lsCounts.pending], ['rejected', 'Refusés', lsCounts.rejected], ['archived', 'Archivés', lsCounts.archived]], set: (v: string) => (lsStatus = v as any) },
							{ label: 'Venue', value: presenceFilter, def: 'all', options: [['all', 'Tous'], ['venu', 'Venus'], ['pas_venu', 'Pas venus'], ['inconnu', 'Non renseignés']], set: (v: string) => (presenceFilter = v as any) },
							{ label: 'Genre', value: genderFilter, def: 'all', options: [['all', 'Tous'], ['fille', 'Filles'], ['garcon', 'Garçons']], set: (v: string) => (genderFilter = v as any) }
						]}
					/>
				</div>
				<div class="flex flex-wrap items-center gap-3">
					<input bind:value={lsSearch} placeholder="Rechercher un nom ou un email…" class="min-w-60 flex-1 rounded-xl border border-dark-accent/10 bg-white px-4 py-2 text-sm" />
				<div class="flex flex-wrap items-center gap-2 print:hidden">
						{#if viewMode === 'inscrits'}
							<form
								method="POST"
								action="?/sendAcceptedInfo"
								use:enhance={({ cancel }) => {
									if (
										!confirm(
											`Envoyer l'email « entraînement dimanche + cash + formulaire » à ${acceptedPlayers.length} joueur(s) accepté(s) ?`
										)
									) {
										cancel();
										return;
									}
									infoSending = true;
									infoResult = '';
									return async ({ result, update }) => {
										infoSending = false;
										infoResult =
											result.type === 'success'
												? `✓ Envoyé à ${(result.data as any)?.sent ?? ''} joueur(s)`
												: String((result as any).data?.error ?? 'Erreur');
										await update({ reset: false });
									};
								}}
								class="flex items-center gap-2"
							>
								<button
									type="submit"
									disabled={infoSending || acceptedPlayers.length === 0}
									class="rounded-xl bg-secondary px-4 py-2 text-sm font-medium text-dark transition-opacity hover:opacity-90 disabled:opacity-40"
								>
									{infoSending ? 'Envoi...' : `Envoyer l'info dimanche (${acceptedPlayers.length})`}
								</button>
								{#if infoResult}<span class="text-xs text-dark-accent">{infoResult}</span>{/if}
							</form>
						{/if}
					{#if viewMode === 'talent_days'}
							<form
								method="POST"
								action="?/sendMakeup"
								use:enhance={({ cancel }) => {
									if (
										!confirm(
											`Envoyer l'email « viens te tester ce week-end » à ${makeupPending} joueur(s) « Pas venu » ?`
										)
									) {
										cancel();
										return;
									}
									makeupSending = true;
									makeupResult = '';
									return async ({ result, update }) => {
										makeupSending = false;
										makeupResult =
											result.type === 'success'
												? `✓ Envoyé à ${(result.data as any)?.makeupSent ?? ''} joueur(s)`
												: String((result as any).data?.error ?? 'Erreur');
										await update({ reset: false });
									};
								}}
								class="flex items-center gap-2"
							>
								<button
									type="submit"
									disabled={makeupPending === 0 || makeupSending}
									title="Envoie l'email de rattrapage aux joueurs marqués « Pas venu »"
									class="rounded-xl bg-secondary px-4 py-2 text-sm font-medium text-dark transition-opacity hover:opacity-90 disabled:opacity-40"
								>
									{makeupSending ? 'Envoi...' : `Email rattrapage (${makeupPending})`}
								</button>
								{#if makeupResult}<span class="text-xs text-dark-accent">{makeupResult}</span>{/if}
							</form>
					{/if}
					{#if viewMode === 'talent_days' || viewMode === 'academie'}
							<button
								type="button"
								onclick={() => {
									addError = '';
								showAdd = true;
							}}
							title={viewMode === 'academie' ? 'Ajouter un joueur (Faire un essai)' : 'Ajouter un joueur (Talent Day)'}
							aria-label="Ajouter un joueur"
							class="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white transition-opacity hover:opacity-90"
						>
							<svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true">
								<path d="M12 5v14M5 12h14" />
							</svg>
						</button>
					{/if}
					<button
						type="button"
						onclick={() => window.print()}
					class="rounded-xl bg-[#f4f5f7] px-4 py-2 text-sm text-dark-accent transition-colors hover:bg-dark-accent/10 print:hidden"
				>
							Imprimer la liste
					</button>
				</div>
			</div>
			</div>

			{#if data.loadError}
				<p class="mb-6 rounded-xl bg-red-100 px-4 py-3 text-sm text-red-700">
					Impossible de charger les inscriptions depuis Directus.
				</p>
			{:else if filteredPlayers.length === 0}
				<p class="rounded-xl bg-[#f4f5f7] px-4 py-3 text-sm text-dark-accent">
					{viewMode === 'talent_days' && tdArchived && tdTab === 'current'
						? 'Rien pour la prochaine édition — voir Historique.'
						: 'Aucune entrée dans cette liste.'}
				</p>
			{/if}

			<!-- Liste (écran) -->
			<div class="flex flex-col gap-2 print:hidden">
				{#each pagedPlayers as player (player.id)}
					{@const age = ageOf(player.birth_date)}
					<div class="rounded-2xl border-l-4 bg-white shadow-sm {statusBar(player)}">
						<div class="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5">
							<span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-dark text-xs font-semibold text-white">{initials(player)}</span>
							<div class="min-w-0 flex-1 basis-52">
								<p class="truncate font-medium text-dark">{player.first_name} {player.last_name}</p>
								<p class="truncate text-xs text-dark-accent">{player.email}{@render resendButton(player)}{@render reminderButton(player)}</p>
							</div>
							<div class="hidden min-w-36 text-xs text-dark-accent lg:block">
								<p class="text-dark">{player.preferred_position ?? '—'}{age ? ` · ${age} ans` : ''}</p>
								<p class="truncate">{player.current_club ?? '—'}</p>
							</div>
							<div class="flex w-full flex-wrap items-center gap-2 sm:w-auto">
								<div class="min-w-36 flex-1 sm:w-40 sm:flex-none">{@render statusSelect(player)}</div>
								<div class="min-w-32 flex-1 sm:w-36 sm:flex-none">{@render venueSelect(player)}</div>
								<button
									type="button"
									onclick={() => (expandedId = expandedId === player.id ? null : player.id)}
									class="rounded-xl bg-[#f4f5f7] px-3 py-2 text-xs text-dark-accent hover:bg-[#eceef1]"
									aria-expanded={expandedId === player.id}
								>{expandedId === player.id ? 'Fermer' : 'Détails'}</button>
								{#if player.status !== 'accepted' && (!isArch(player) || player.archived === true)}
									<form method="POST" action="?/archivePlayer" use:enhance={() => async ({ result, update }) => {
										if (result.type === 'failure') alert(String((result.data as any)?.error ?? 'Erreur'));
										await update({ reset: false });
									}}>
										<input type="hidden" name="id" value={player.id} />
										<input type="hidden" name="archived" value={isArch(player) ? 'false' : 'true'} />
										<button class="rounded-xl bg-[#f4f5f7] px-3 py-2 text-xs text-dark-accent hover:bg-[#eceef1]">{isArch(player) ? 'Désarchiver' : 'Archiver'}</button>
									</form>
								{/if}
							</div>
						</div>

						{#if expandedId === player.id}
							<div class="border-t border-dark-accent/10 px-4 py-4">
								<dl class="grid grid-cols-2 gap-x-6 gap-y-3 text-sm md:grid-cols-4">
									<div><dt class="text-[11px] uppercase text-dark-accent">Genre</dt><dd class="text-dark">{genderLabel(player.gender)}</dd></div>
									<div><dt class="text-[11px] uppercase text-dark-accent">Naissance</dt><dd class="text-dark">{@render valueOrMissing(player.birth_date ? formatDate(player.birth_date) : null)}</dd></div>
									<div><dt class="text-[11px] uppercase text-dark-accent">Téléphone</dt><dd class="text-dark">{@render valueOrMissing(player.phone)}</dd></div>
									<div><dt class="text-[11px] uppercase text-dark-accent">Instagram</dt><dd class="text-dark">{#if cleanInstagram(player.instagram)}<a href={`https://instagram.com/${cleanInstagram(player.instagram)}`} target="_blank" rel="noopener noreferrer" class="text-primary underline">@{cleanInstagram(player.instagram)}</a>{:else}—{/if}</dd></div>
									<div><dt class="text-[11px] uppercase text-dark-accent">Club</dt><dd class="text-dark">{@render valueOrMissing(player.current_club)}</dd></div>
									<div><dt class="text-[11px] uppercase text-dark-accent">Division</dt><dd class="text-dark">{@render valueOrMissing(player.division ? divisionLabel(player.division) : null)}</dd></div>
									{#if player.type === 'academie' || player.status === 'accepted'}
										<div><dt class="text-[11px] uppercase text-dark-accent">Lieu de naissance</dt><dd class="text-dark">{@render valueOrMissing(player.birth_place)}</dd></div>
										<div><dt class="text-[11px] uppercase text-dark-accent">Nationalité</dt><dd class="text-dark">{@render valueOrMissing(player.nationality)}</dd></div>
										<div class="col-span-2"><dt class="text-[11px] uppercase text-dark-accent">Adresse</dt><dd class="text-dark">{@render valueOrMissing(player.address)}{player.postal_code ? `, ${player.postal_code}` : ''}</dd></div>
									{/if}
								</dl>
								<div class="mt-4 flex flex-wrap items-center gap-3">
									{#if player.complete}
										<span class="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">Dossier complet</span>
									{:else}
										<span class="rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700" title={player.missing.join(', ')}>Incomplet : {player.missing.join(', ')}</span>
									{/if}
									{#if player.id_card_front || player.id_card_back}{@render idCardButtons(player)}{/if}
									<button type="button" onclick={() => (editingId = editingId === player.id ? null : player.id)} class="rounded-xl bg-[#f4f5f7] px-3 py-1.5 text-xs text-dark-accent hover:bg-[#eceef1]">Modifier</button>
								</div>
								{@render extraPanel(player)}
								{#if editingId === player.id}
									{@render editForm(player)}
								{/if}
							</div>
						{/if}
					</div>
				{/each}
			</div>

			<!-- Vue tableau : desktop + impression -->
			<div
				class="hidden print:block"
			>
				<table class="w-full text-left text-sm">
					<thead class="bg-[#f4f5f7] print:bg-transparent">
						<tr>
							<th
								class="whitespace-nowrap px-5 py-4 text-xs font-medium uppercase tracking-wide text-dark-accent/70 print:whitespace-normal print:wrap-break-words print:px-2 print:py-2 print:text-xs"
								>Nom</th
							>
							<th
								class="whitespace-nowrap px-5 py-4 text-xs font-medium uppercase tracking-wide text-dark-accent/70 print:whitespace-normal print:wrap-break-words print:px-2 print:py-2 print:text-xs"
								>Genre</th
							>
							<th
								class="whitespace-nowrap px-5 py-4 text-xs font-medium uppercase tracking-wide text-dark-accent/70 print:whitespace-normal print:wrap-break-words print:px-2 print:py-2 print:text-xs"
								>Naissance</th
							>
							{#if showAcademieFields}
								<th
									class="whitespace-nowrap px-5 py-4 text-xs font-medium uppercase tracking-wide text-dark-accent/70 print:whitespace-normal print:wrap-break-words print:px-2 print:py-2 print:text-xs"
									>Lieu de naissance</th
								>
								<th
									class="whitespace-nowrap px-5 py-4 text-xs font-medium uppercase tracking-wide text-dark-accent/70 print:whitespace-normal print:wrap-break-words print:px-2 print:py-2 print:text-xs"
									>Nationalité</th
								>
							{/if}
							{#if showAcademieFields}
								<th
									class="whitespace-nowrap px-5 py-4 text-xs font-medium uppercase tracking-wide text-dark-accent/70 print:whitespace-normal print:wrap-break-words print:px-2 print:py-2 print:text-xs"
									>Adresse</th
								>
								<th
									class="whitespace-nowrap px-5 py-4 text-xs font-medium uppercase tracking-wide text-dark-accent/70 print:whitespace-normal print:wrap-break-words print:px-2 print:py-2 print:text-xs"
									>Code postal</th
								>
							{/if}
							<th
								class="whitespace-nowrap px-5 py-4 text-xs font-medium uppercase tracking-wide text-dark-accent/70 print:whitespace-normal print:wrap-break-words print:px-2 print:py-2 print:text-xs"
								>Téléphone</th
							>
							<th
								class="whitespace-nowrap px-5 py-4 text-xs font-medium uppercase tracking-wide text-dark-accent/70 print:whitespace-normal print:wrap-break-words print:px-2 print:py-2 print:text-xs"
								>Email</th
							>
							<th
								class="whitespace-nowrap px-5 py-4 text-xs font-medium uppercase tracking-wide text-dark-accent/70 print:whitespace-normal print:wrap-break-words print:px-2 print:py-2 print:text-xs"
								>Instagram</th
							>
							<th
								class="whitespace-nowrap px-5 py-4 text-xs font-medium uppercase tracking-wide text-dark-accent/70 print:whitespace-normal print:wrap-break-words print:px-2 print:py-2 print:text-xs"
								>Poste</th
							>
							<th
								class="whitespace-nowrap px-5 py-4 text-xs font-medium uppercase tracking-wide text-dark-accent/70 print:whitespace-normal print:wrap-break-words print:px-2 print:py-2 print:text-xs"
								>Club</th
							>
							<th
								class="whitespace-nowrap px-5 py-4 text-xs font-medium uppercase tracking-wide text-dark-accent/70 print:whitespace-normal print:wrap-break-words print:px-2 print:py-2 print:text-xs"
								>Division</th
							>
							<th
								class="whitespace-nowrap px-5 py-4 text-xs font-medium uppercase tracking-wide text-dark-accent/70 print:hidden"
								>Complétude</th
							>
							<th
								class="whitespace-nowrap px-5 py-4 text-xs font-medium uppercase tracking-wide text-dark-accent/70 print:whitespace-normal print:wrap-break-words print:px-2 print:py-2 print:text-xs"
								>Statut</th
							>
							<th
								class="whitespace-nowrap px-5 py-4 text-xs font-medium uppercase tracking-wide text-dark-accent/70 print:hidden"
								>Carte ID</th
							>
							<th class="whitespace-nowrap px-5 py-4 print:hidden"></th>
						</tr>
					</thead>
					<tbody>
						{#each filteredPlayers as player (player.id)}
							<tr class="border-t border-dark-accent/10 transition-colors hover:bg-[#f4f5f7]/60">
								<td
									class="whitespace-nowrap px-5 py-4 print:whitespace-normal print:wrap-break-words print:px-2 print:py-2 print:text-xs"
								>
									<div class="flex items-center gap-3">
										<span
											class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary print:hidden"
										>
											{initials(player)}
										</span>
										<span class="text-dark">{player.first_name} {player.last_name}</span>
									</div>
								</td>
								<td
									class="whitespace-nowrap px-5 py-4 text-dark-accent print:whitespace-normal print:wrap-break-words print:px-2 print:py-2 print:text-xs"
									>{genderLabel(player.gender)}</td
								>
								<td
									class="whitespace-nowrap px-5 py-4 text-dark-accent print:whitespace-normal print:wrap-break-words print:px-2 print:py-2 print:text-xs"
									>{@render valueOrMissing(
										player.birth_date ? formatDate(player.birth_date) : null
									)}</td
								>
								{#if showAcademieFields}
									<td
										class="whitespace-nowrap px-5 py-4 text-dark-accent print:whitespace-normal print:wrap-break-words print:px-2 print:py-2 print:text-xs"
										>{@render valueOrMissing(player.birth_place)}</td
									>
									<td
										class="whitespace-nowrap px-5 py-4 text-dark-accent print:whitespace-normal print:wrap-break-words print:px-2 print:py-2 print:text-xs"
										>{@render valueOrMissing(player.nationality)}</td
									>
								{/if}
								{#if showAcademieFields}
									<td
										class="whitespace-nowrap px-5 py-4 text-dark-accent print:whitespace-normal print:wrap-break-words print:px-2 print:py-2 print:text-xs"
										>{@render valueOrMissing(player.address)}</td
									>
									<td
										class="whitespace-nowrap px-5 py-4 text-dark-accent print:whitespace-normal print:wrap-break-words print:px-2 print:py-2 print:text-xs"
										>{@render valueOrMissing(player.postal_code)}</td
									>
								{/if}
								<td
									class="whitespace-nowrap px-5 py-4 text-dark-accent print:whitespace-normal print:wrap-break-words print:px-2 print:py-2 print:text-xs"
									>{@render valueOrMissing(player.phone)}</td
								>
								<td
									class="whitespace-nowrap px-5 py-4 text-dark-accent print:whitespace-normal print:wrap-break-words print:px-2 print:py-2 print:text-xs"
									>{player.email}{@render resendButton(player)}{@render reminderButton(player)}</td
								>
								<td
									class="whitespace-nowrap px-5 py-4 text-dark-accent print:whitespace-normal print:wrap-break-words print:px-2 print:py-2 print:text-xs"
								>
									{#if cleanInstagram(player.instagram)}
										<a
											href={`https://instagram.com/${cleanInstagram(player.instagram)}`}
											target="_blank"
											rel="noopener noreferrer"
											class="text-primary underline"
											>@{cleanInstagram(player.instagram)}</a
										>
									{:else}
										—
									{/if}
								</td>
								<td
									class="whitespace-nowrap px-5 py-4 text-dark-accent print:whitespace-normal print:wrap-break-words print:px-2 print:py-2 print:text-xs"
									>{@render valueOrMissing(player.preferred_position)}</td
								>
								<td
									class="whitespace-nowrap px-5 py-4 text-dark-accent print:whitespace-normal print:wrap-break-words print:px-2 print:py-2 print:text-xs"
									>{@render valueOrMissing(player.current_club)}</td
								>
								<td
									class="whitespace-nowrap px-5 py-4 text-dark-accent print:whitespace-normal print:wrap-break-words print:px-2 print:py-2 print:text-xs"
									>{@render valueOrMissing(
										player.division ? divisionLabel(player.division) : null
									)}</td
								>
								<td class="px-5 py-4 print:hidden">
									{#if player.complete}
										<span class="rounded-full bg-green-100 px-2 py-1 text-xs text-green-700"
											>Oui</span
										>
									{:else}
										<span
											class="rounded-full bg-red-100 px-2 py-1 text-xs text-red-700"
											title={player.missing.join(', ')}>Non</span
										>
									{/if}
								</td>
								<td
									class="px-5 py-4 print:whitespace-normal print:wrap-break-words print:px-2 print:py-2 print:text-xs"
									>{@render statusSelect(player)}{@render venueSelect(player)}</td
								>
								<td class="px-5 py-4 print:hidden">{@render idCardButtons(player)}</td>
								<td class="px-5 py-4 print:hidden">
									<button
										type="button"
										onclick={() => (editingId = editingId === player.id ? null : player.id)}
										class="rounded-xl bg-[#f4f5f7] px-3 py-1.5 text-xs text-dark-accent"
									>
										Modifier
									</button>
								</td>
							</tr>
							{#if viewMode !== 'talent_days' && player.dossier}
								<tr class="print:hidden">
									<td colspan="15" class="px-5 pb-4">{@render extraPanel(player)}</td>
								</tr>
							{/if}
							{#if editingId === player.id}
								<tr class="border-t border-dark-accent/10 print:hidden">
									<td colspan="15"class="px-5 pb-4">{@render editForm(player)}</td>
								</tr>
							{/if}
						{/each}
					</tbody>
				</table>
			</div>
			{#if listPageCount > 1}
				<div class="mt-4 flex items-center justify-between text-sm text-dark-accent print:hidden">
					<span>{(listPage - 1) * LIST_SIZE + 1}–{Math.min(listPage * LIST_SIZE, filteredPlayers.length)} sur {filteredPlayers.length}</span>
					<div class="flex gap-1">
						<button disabled={listPage === 1} onclick={() => listPage--} class="rounded-lg bg-[#f4f5f7] px-3 py-1.5 disabled:opacity-40">←</button>
						{#each Array(listPageCount) as _, i}
							<button onclick={() => (listPage = i + 1)} class="rounded-lg px-3 py-1.5 {listPage === i + 1 ? 'bg-dark text-white' : 'bg-[#f4f5f7]'}">{i + 1}</button>
						{/each}
						<button disabled={listPage === listPageCount} onclick={() => listPage++} class="rounded-lg bg-[#f4f5f7] px-3 py-1.5 disabled:opacity-40">→</button>
					</div>
				</div>
			{/if}
		</div>
	{/if}
</div>

{#if showAdd}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 print:hidden"
		role="dialog"
		aria-modal="true"
	>
		<form
			method="POST"
			action="?/addPlayer"
			use:enhance={() =>
				async ({ result, update }) => {
					if (result.type === 'success') {
						showAdd = false;
						await update();
					} else {
						addError =
							result.type === 'failure'
								? String((result.data as any)?.addError ?? 'Erreur')
								: 'Erreur';
					}
				}}
			class="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
		>
			<input type="hidden" name="type" value={viewMode === 'academie' ? 'academie' : 'talent_days'} />
			<h2 class="font-clash mb-4 text-lg text-dark">Ajouter un joueur ({viewMode === 'academie' ? 'Faire un essai' : 'Talent Day'})</h2>
			<div class="grid grid-cols-2 gap-3 text-sm">
				<input name="first_name" required placeholder="Prénom *" class="rounded-xl border border-dark-accent/10 bg-[#f4f5f7] px-3 py-2" />
				<input name="last_name" required placeholder="Nom *" class="rounded-xl border border-dark-accent/10 bg-[#f4f5f7] px-3 py-2" />
				<select name="gender" class="rounded-xl border border-dark-accent/10 bg-[#f4f5f7] px-3 py-2">
					<option value="">Genre</option>
					<option value="fille">Femme</option>
					<option value="garcon">Homme</option>
				</select>
				<input name="birth_date" type="date" class="rounded-xl border border-dark-accent/10 bg-[#f4f5f7] px-3 py-2" />
				<input name="email" type="email" placeholder="Email" class="col-span-2 rounded-xl border border-dark-accent/10 bg-[#f4f5f7] px-3 py-2" />
				<input name="phone" placeholder="Téléphone" class="rounded-xl border border-dark-accent/10 bg-[#f4f5f7] px-3 py-2" />
				<input name="instagram" placeholder="Instagram" class="rounded-xl border border-dark-accent/10 bg-[#f4f5f7] px-3 py-2" />
				<select name="preferred_position" class="rounded-xl border border-dark-accent/10 bg-[#f4f5f7] px-3 py-2">
					<option value="">Poste</option>
					<option value="GK">Gardien de but</option>
					<option value="CB">Défenseur central</option>
					<option value="LB_RB">Latéral</option>
					<option value="LWB_RWB">Piston</option>
					<option value="SW">Libéro</option>
					<option value="CDM">Milieu défensif</option>
					<option value="CM">Milieu central</option>
					<option value="CAM">Milieu offensif</option>
					<option value="LM_RM">Milieu latéral</option>
					<option value="ST">Avant-centre</option>
					<option value="LW_RW">Ailier</option>
					<option value="CF">Second attaquant</option>
					<option value="F9">Faux numéro 9</option>
				</select>
				<input name="current_club" placeholder="Club actuel" class="rounded-xl border border-dark-accent/10 bg-[#f4f5f7] px-3 py-2" />
			</div>
			{#if addError}
				<p class="mt-3 rounded-xl bg-red-100 px-3 py-2 text-xs text-red-700">{addError}</p>
			{/if}
			<div class="mt-5 flex justify-end gap-2">
				<button type="button" onclick={() => (showAdd = false)} class="rounded-xl bg-[#f4f5f7] px-4 py-2 text-sm text-dark-accent">Annuler</button>
				<button type="submit" class="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white">Ajouter</button>
			</div>
		</form>
	</div>
{/if}

<style>
	@media print {
		@page {
			size: landscape;
			margin: 1cm;
		}
	}
</style>
