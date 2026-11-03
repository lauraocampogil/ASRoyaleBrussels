<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import type { SubmitFunction } from '@sveltejs/kit';
	import type { PageData } from './$types';
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
		acceptedPlayers.reduce((sum: number, p: any) => sum + payTotal(p), 0)
	);
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
	let makeupSending = $state(false);
	let tdAll = $derived(data.players.filter((p: any) => p.type === 'talent_days'));
	let presentCount = $derived(tdAll.filter((p: any) => p.venue === true).length);
	let absentCount = $derived(tdAll.filter((p: any) => p.venue === false).length);
	let unknownCount = $derived(tdAll.filter((p: any) => p.venue !== true && p.venue !== false).length);
	let makeupPending = $derived(
		tdAll.filter((p: any) => p.venue === false && p.rattrapage_envoye !== true && p.email).length
	);
	// --- Présences des joueurs de l'académie : une boîte par joueur, une ligne par date ---
	const todayIso = new Date().toISOString().slice(0, 10);
	const presEntries = (player: any): [string, string][] =>
		Object.entries(player.presences ?? {}).sort((x, y) => y[0].localeCompare(x[0])) as [
			string,
			string
		][];
	const presCount = (player: any, status: string) =>
		presEntries(player).filter(([, st]) => st === status).length;
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
		data.talentDay
			? Math.ceil((new Date(data.talentDay.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
			: null
	);

	function pct(count: number, total: number) {
		return total ? Math.round((count / total) * 100) : 0;
	}

	let baseFiltered = $derived(
		viewMode === 'talent_days'
			? talentDayPlayers
			: viewMode === 'academie'
				? academiePlayers
				: acceptedPlayers
	);

	let filteredPlayers = $derived(
		(genderFilter === 'all'
			? baseFiltered
			: baseFiltered.filter((p: any) => normGender(p.gender) === genderFilter)
		).filter((p: any) =>
			viewMode !== 'talent_days' || presenceFilter === 'all'
				? true
				: presenceFilter === 'venu'
					? p.venue === true
					: presenceFilter === 'pas_venu'
						? p.venue === false
						: p.venue !== true && p.venue !== false
		)
	);

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
		acceptedPlayers.filter(
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
				<details class="rounded-xl border border-dark-accent/10 bg-white p-3">
					<summary class="cursor-pointer text-sm font-semibold text-dark">Dossier de candidature</summary>
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
												<dd class="whitespace-pre-line text-dark">{fmtDossier(k, player.dossier[k])}</dd>
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
		<h1 class="font-clash mb-4 text-xl text-dark sm:text-2xl">Vue d'ensemble</h1>

		{#if data.talentDay && talentDayDaysLeft !== null}
			<div
				class="mb-4 flex flex-col gap-2 rounded-2xl bg-secondary p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between"
			>
				<div>
					<p class="text-xs font-medium text-dark/70">Talent Day</p>
					<p class="font-clash text-lg text-dark">
						{new Intl.DateTimeFormat('fr-BE', {
							day: 'numeric',
							month: 'long',
							year: 'numeric'
						}).format(new Date(data.talentDay.date))}
					</p>
				</div>
				<p class="font-clash text-2xl text-dark">
					{talentDayDaysLeft > 0
						? `J-${talentDayDaysLeft}`
						: talentDayDaysLeft === 0
							? "Aujourd'hui"
							: 'Passé'}
				</p>
			</div>
		{/if}

		<div class="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
			<div class="rounded-2xl bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
				<div
					class="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-purple-100 text-purple-600"
				>
					<svg
						width="18"
						height="18"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
					>
						<circle cx="12" cy="8" r="4" /><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" />
					</svg>
				</div>
				<p class="text-xs font-medium text-dark-accent">Talent Day</p>
				<p class="font-clash text-2xl text-dark">{talentDayPlayers.length}</p>
			</div>
			<div class="rounded-2xl bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
				<div
					class="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600"
				>
					<svg
						width="18"
						height="18"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
					>
						<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle
							cx="9"
							cy="7"
							r="4"
						/><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
					</svg>
				</div>
				<p class="text-xs font-medium text-dark-accent">Académie</p>
				<p class="font-clash text-2xl text-dark">{academiePlayers.length}</p>
			</div>
			<div class="rounded-2xl bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
				<div
					class="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-green-600"
				>
					<svg
						width="18"
						height="18"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
					>
						<polyline points="20 6 9 17 4 12" />
					</svg>
				</div>
				<p class="text-xs font-medium text-dark-accent">Joueurs inscrits</p>
				<p class="font-clash text-2xl text-dark">{acceptedPlayers.length}</p>
			</div>
				<div class="rounded-2xl bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
					<div
						class="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-green-600"
					>
						<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
						</svg>
					</div>
					<p class="text-xs font-medium text-dark-accent">Présences Talent Day</p>
					<p class="font-clash text-2xl text-dark">{presentCount} <span class="text-sm text-dark-accent">venus</span></p>
					<p class="mt-1 text-xs text-dark-accent">
						{absentCount} pas venus · {unknownCount} non renseignés
					</p>
				</div>
			<div class="rounded-2xl bg-dark p-5 shadow-sm transition-shadow hover:shadow-md">
				<div
					class="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-dark"
				>
					<svg
						width="18"
						height="18"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
					>
						<rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18" />
					</svg>
				</div>
				<p class="text-xs font-medium text-white/60">Total</p>
				<p class="font-clash text-2xl text-white">{data.players.length}</p>
			</div>
		</div>

		<div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
			<div class="rounded-2xl bg-white p-5 shadow-sm">
				<p class="font-clash mb-4 text-sm text-dark">Répartition par genre</p>
				<div class="mb-3">
					<div class="mb-1 flex justify-between text-xs text-dark-accent">
						<span>Femmes</span><span>{femaleCount}</span>
					</div>
					<div class="h-2 w-full overflow-hidden rounded-full bg-[#f4f5f7]">
						<div
							class="h-full rounded-full bg-purple-400"
							style="width: {pct(femaleCount, genderKnownTotal)}%"
						></div>
					</div>
				</div>
				<div>
					<div class="mb-1 flex justify-between text-xs text-dark-accent">
						<span>Hommes</span><span>{maleCount}</span>
					</div>
					<div class="h-2 w-full overflow-hidden rounded-full bg-[#f4f5f7]">
						<div
							class="h-full rounded-full bg-blue-400"
							style="width: {pct(maleCount, genderKnownTotal)}%"
						></div>
					</div>
				</div>
			</div>

			<div class="rounded-2xl bg-white p-5 shadow-sm">
				<p class="font-clash mb-4 text-sm text-dark">Statut des candidatures</p>
				<div class="mb-3">
					<div class="mb-1 flex justify-between text-xs text-dark-accent">
						<span>En attente</span><span>{pendingCount}</span>
					</div>
					<div class="h-2 w-full overflow-hidden rounded-full bg-[#f4f5f7]">
						<div
							class="h-full rounded-full bg-yellow-400"
							style="width: {pct(pendingCount, data.players.length)}%"
						></div>
					</div>
				</div>
				<div class="mb-3">
					<div class="mb-1 flex justify-between text-xs text-dark-accent">
						<span>Acceptés</span><span>{acceptedPlayers.length}</span>
					</div>
					<div class="h-2 w-full overflow-hidden rounded-full bg-[#f4f5f7]">
						<div
							class="h-full rounded-full bg-green-400"
							style="width: {pct(acceptedPlayers.length, data.players.length)}%"
						></div>
					</div>
				</div>
				<div>
					<div class="mb-1 flex justify-between text-xs text-dark-accent">
						<span>Refusés</span><span>{rejectedCount}</span>
					</div>
					<div class="h-2 w-full overflow-hidden rounded-full bg-[#f4f5f7]">
						<div
							class="h-full rounded-full bg-red-400"
							style="width: {pct(rejectedCount, data.players.length)}%"
						></div>
					</div>
				</div>
				<p class="mt-4 text-xs text-dark-accent">{completionRate}% des dossiers sont complets</p>
			</div>

			<div class="rounded-2xl bg-white p-5 shadow-sm">
				<p class="font-clash mb-4 text-sm text-dark">Dernières inscriptions</p>
				<div class="flex flex-col gap-3">
					{#each recentPlayers as player (player.id)}
						<div class="flex items-center justify-between gap-2">
							<div class="flex items-center gap-2">
								<span
									class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary"
								>
									{initials(player)}
								</span>
								<span class="truncate text-sm text-dark"
									>{player.first_name} {player.last_name}</span
								>
							</div>
							<span class="shrink-0 rounded-full bg-[#f4f5f7] px-2 py-1 text-xs text-dark-accent">
								{player.type === 'talent_days' ? 'Talent Day' : 'Académie'}
							</span>
						</div>
					{:else}
						<p class="text-xs text-dark-accent">Aucune inscription pour le moment.</p>
					{/each}
				</div>
			</div>
		</div>
	{:else if viewMode === 'presences'}
		<div class="rounded-2xl bg-white p-5 shadow-sm">
			<h1 class="font-clash mb-1 text-xl text-dark sm:text-2xl">
				Présences ({acceptedPlayers.length} joueurs)
			</h1>
			<p class="mb-6 text-sm text-dark-accent">
				Pour chaque joueur, ajoute la date et sa présence. Chaque ajout reste dans sa boîte.
			</p>

			{#if acceptedPlayers.length === 0}
				<p class="rounded-xl bg-[#f4f5f7] px-4 py-3 text-sm text-dark-accent">
					Aucun joueur accepté pour le moment.
				</p>
			{/if}

			<div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
				{#each acceptedPlayers as player (player.id)}
					<div class="rounded-xl border border-dark-accent/10 p-4">
						<div class="mb-3 flex items-start justify-between gap-2">
							<div>
								<p class="text-sm font-semibold text-dark">
									{player.first_name}
									{player.last_name}
								</p>
								<p class="text-xs text-dark-accent">{genderLabel(player.gender)}</p>
							</div>
							<div class="flex gap-1.5">
								<span class="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700"
									>{presCount(player, 'present')} présent(s)</span
								>
								<span class="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700"
									>{presCount(player, 'absent')} absent(s)</span
								>
							</div>
						</div>

						<form
							method="POST"
							action="?/updatePresence"
							use:enhance
							class="mb-3 flex flex-wrap items-center gap-2"
						>
							<input type="hidden" name="id" value={player.id} />
							<input
								type="date"
								name="date"
								required
								value={todayIso}
								class="rounded-xl border border-dark-accent/10 bg-[#f4f5f7] px-3 py-1.5 text-sm text-dark"
							/>
							<select
								name="status"
								class="rounded-xl border border-dark-accent/10 bg-[#f4f5f7] px-3 py-1.5 text-sm text-dark"
							>
								<option value="present">Présent</option>
								<option value="absent">Absent</option>
							</select>
							<button
								type="submit"
								class="rounded-xl bg-primary px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
							>
								Ajouter
							</button>
						</form>

						{#if presEntries(player).length === 0}
							<p class="text-xs text-dark-accent">Aucune présence enregistrée.</p>
						{:else}
							<ul class="flex flex-col gap-1.5">
								{#each presEntries(player) as [date, st] (date)}
									<li class="flex items-center justify-between rounded-lg bg-[#f4f5f7] px-3 py-1.5">
										<span class="text-sm text-dark">{formatDate(date)}</span>
										<span class="flex items-center gap-2">
											<span
												class="rounded-full px-2 py-0.5 text-xs font-medium {st === 'present'
													? 'bg-green-600 text-white'
													: st === 'absent'
														? 'bg-red-600 text-white'
														: 'bg-yellow-500 text-white'}"
												>{st === 'present' ? 'Présent' : st === 'absent' ? 'Absent' : 'Excusé'}</span
											>
											<form method="POST" action="?/updatePresence" use:enhance class="inline">
												<input type="hidden" name="id" value={player.id} />
												<input type="hidden" name="date" value={date} />
												<button
													type="submit"
													name="status"
													value=""
													title="Supprimer cette ligne"
													aria-label="Supprimer cette ligne"
													class="text-lg leading-none text-dark-accent hover:text-red-600">×</button
												>
											</form>
										</span>
									</li>
								{/each}
							</ul>
						{/if}
					</div>
				{/each}
			</div>
		</div>
	{:else if viewMode === 'paiements'}
		<div class="rounded-2xl bg-white p-5 shadow-sm">
			<div class="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 class="font-clash text-xl text-dark sm:text-2xl">
						Paiements ({acceptedPlayers.length} joueurs)
					</h1>
					<p class="text-sm text-dark-accent">
						Cotisation annuelle {FEES.annual} € · mensualité {FEES.monthly.garcon} € (hommes) /
						{FEES.monthly.fille} € (femmes). Ajoute chaque paiement avec sa date.
					</p>
				</div>
				<span class="rounded-full bg-green-100 px-4 py-2 text-sm font-semibold text-green-700"
					>Total encaissé : {totalCollected} €</span
				>
			</div>

			{#if acceptedPlayers.length === 0}
				<p class="rounded-xl bg-[#f4f5f7] px-4 py-3 text-sm text-dark-accent">
					Aucun joueur accepté pour le moment.
				</p>
			{/if}

			<div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
				{#each acceptedPlayers as player (player.id)}
					<div class="rounded-xl border border-dark-accent/10 p-4">
						<div class="mb-3 flex items-start justify-between gap-2">
							<div>
								<p class="text-sm font-semibold text-dark">
									{player.first_name}
									{player.last_name}
								</p>
								<p class="text-xs text-dark-accent">
									{genderLabel(player.gender)} · mensualité
									{monthlyFee(player) ? `${monthlyFee(player)} €` : '?'}
								</p>
							</div>
							<span class="text-sm font-semibold text-dark">{payTotal(player)} €</span>
						</div>

						<div class="mb-3 flex flex-wrap gap-2">
							{#if annualEntry(player)}
								<span class="rounded-full bg-green-600 px-3 py-1 text-xs font-medium text-white"
									>✓ Annuel payé le {formatDate(annualEntry(player).date)}</span
								>
							{:else}
								<span class="rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700"
									>✗ Annuel non payé ({FEES.annual} €)</span
								>
							{/if}
							{#if monthEntry(player, currentMonth)}
								<span class="rounded-full bg-green-600 px-3 py-1 text-xs font-medium text-white"
									>✓ {monthLabel(currentMonth)} payé le {formatDate(
										monthEntry(player, currentMonth).date
									)}</span
								>
							{:else}
								<span class="rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700"
									>✗ {monthLabel(currentMonth)} non payé</span
								>
							{/if}
						</div>

						<form
							method="POST"
							action="?/addPayment"
							use:enhance
							class="mb-3 grid grid-cols-2 gap-2 rounded-xl bg-[#f4f5f7] p-3 text-sm"
						>
							<input type="hidden" name="id" value={player.id} />
							<label class="flex flex-col gap-1 text-xs text-dark-accent">
								Type
								<select
									name="type"
									class="rounded-lg border border-dark-accent/10 bg-white px-2 py-1.5 text-sm text-dark"
								>
									<option value="mensuel">Mensualité</option>
									<option value="annuel">Cotisation annuelle</option>
								</select>
							</label>
							<label class="flex flex-col gap-1 text-xs text-dark-accent">
								Mois concerné (mensualité)
								<input
									type="month"
									name="mois"
									value={currentMonth}
									class="rounded-lg border border-dark-accent/10 bg-white px-2 py-1.5 text-sm text-dark"
								/>
							</label>
							<label class="flex flex-col gap-1 text-xs text-dark-accent">
								Date du paiement
								<input
									type="date"
									name="date"
									required
									value={todayIso}
									class="rounded-lg border border-dark-accent/10 bg-white px-2 py-1.5 text-sm text-dark"
								/>
							</label>
							<label class="flex flex-col gap-1 text-xs text-dark-accent">
								Montant € (vide = montant normal)
								<input
									type="number"
									name="montant"
									min="0"
									step="0.01"
									placeholder={monthlyFee(player) ? String(monthlyFee(player)) : '80'}
									class="rounded-lg border border-dark-accent/10 bg-white px-2 py-1.5 text-sm text-dark"
								/>
							</label>
							<button
								type="submit"
								class="col-span-2 rounded-xl bg-primary px-3 py-2 text-sm font-medium text-white hover:opacity-90"
							>
								Enregistrer le paiement
							</button>
						</form>

						{#if payList(player).length === 0}
							<p class="text-xs text-dark-accent">Aucun paiement enregistré.</p>
						{:else}
							<ul class="flex flex-col gap-1.5">
								{#each payList(player) as entry (entry.id)}
									<li class="flex items-center justify-between rounded-lg bg-green-50 px-3 py-1.5">
										<span class="text-sm text-dark">
											<span class="font-medium">{formatDate(entry.date)}</span>
											· {entry.type === 'annuel' ? 'Cotisation annuelle' : monthLabel(entry.mois)}
										</span>
										<span class="flex items-center gap-2">
											<span class="text-sm font-semibold text-green-700">{entry.montant} €</span>
											<form method="POST" action="?/deletePayment" use:enhance class="inline">
												<input type="hidden" name="id" value={player.id} />
												<input type="hidden" name="entry" value={entry.id} />
												<button
													type="submit"
													title="Supprimer ce paiement"
													aria-label="Supprimer ce paiement"
													onclick={(e) => {
														if (!confirm('Supprimer ce paiement ?')) e.preventDefault();
													}}
													class="text-lg leading-none text-dark-accent hover:text-red-600">×</button
												>
											</form>
										</span>
									</li>
								{/each}
							</ul>
						{/if}
					</div>
				{/each}
			</div>
		</div>
	{:else if viewMode === 'stats'}
		<div class="rounded-2xl bg-white p-5 shadow-sm">
			<div class="mb-6 flex flex-wrap items-center gap-3">
				<h1 class="font-clash text-xl text-dark sm:text-2xl">
					Stats joueurs ({statsPlayers.length})
				</h1>
				<select
					bind:value={genderFilter}
					class="rounded-xl border border-dark-accent/10 bg-[#f4f5f7] px-3 py-2 text-sm text-dark"
				>
					<option value="all">Tous les genres</option>
					<option value="fille">Femmes</option>
					<option value="garcon">Hommes</option>
				</select>
						{#if viewMode === 'talent_days'}
							<select
								bind:value={presenceFilter}
								class="rounded-xl border border-dark-accent/10 bg-[#f4f5f7] px-3 py-2 text-sm text-dark print:hidden"
							>
								<option value="all">Toutes les présences</option>
								<option value="venu">Venus ({presentCount})</option>
								<option value="pas_venu">Pas venus ({absentCount})</option>
								<option value="inconnu">Non renseignés ({unknownCount})</option>
							</select>
						{/if}
				<input
					type="search"
					bind:value={statsSearch}
					placeholder="Rechercher un joueur"
					aria-label="Rechercher un joueur"
					class="w-full rounded-xl border border-dark-accent/10 bg-[#f4f5f7] px-3 py-2 text-sm text-dark sm:w-60"
				/>
			</div>

			{#if statsPlayers.length === 0}
				<p class="rounded-xl bg-[#f4f5f7] px-4 py-3 text-sm text-dark-accent">
					Aucun joueur accepté pour le moment.
				</p>
			{/if}

			<div class="flex flex-col gap-3">
				{#each statsPlayers as player (player.id)}
					{#if player.siteProfile}
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
							class="grid grid-cols-2 items-end gap-3 rounded-xl border border-dark-accent/10 p-4 md:grid-cols-[1.4fr_repeat(4,1fr)_auto]"
						>
							<input type="hidden" name="profile_id" value={player.siteProfile.id} />

							<div class="col-span-2 flex items-center gap-3 md:col-span-1">
								<span
									class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary"
								>
									{initials(player)}
								</span>
								<div class="min-w-0">
									<p class="truncate font-medium text-dark">
										{player.first_name}
										{player.last_name}
									</p>
									<p class="truncate text-xs text-dark-accent">{player.preferred_position}</p>
								</div>
							</div>

							<label class="text-xs text-dark-accent">
								Taille (cm)
								<input
									type="number"
									name="height"
									min="100"
									max="230"
									value={player.siteProfile.height ?? ''}
									class="mt-1 w-full rounded-lg border border-dark-accent/20 bg-white px-3 py-2 text-sm text-dark"
								/>
							</label>
							<label class="text-xs text-dark-accent">
								Pied fort
								<select
									name="foot"
									value={player.siteProfile.foot ?? ''}
									class="mt-1 w-full rounded-lg border border-dark-accent/20 bg-white px-3 py-2 text-sm text-dark"
								>
									<option value="">—</option>
									<option value="droit">Droit</option>
									<option value="gauche">Gauche</option>
									<option value="les deux">Les deux</option>
									{#if player.siteProfile.foot && !['droit', 'gauche', 'les deux'].includes(player.siteProfile.foot)}
										<option value={player.siteProfile.foot}>{player.siteProfile.foot}</option>
									{/if}
								</select>
							</label>
							<label class="text-xs text-dark-accent">
								Buts
								<input
									type="number"
									name="goals"
									min="0"
									value={player.siteProfile.goals ?? ''}
									class="mt-1 w-full rounded-lg border border-dark-accent/20 bg-white px-3 py-2 text-sm text-dark"
								/>
							</label>
							<label class="text-xs text-dark-accent">
								Passes décisives
								<input
									type="number"
									name="assists"
									min="0"
									value={player.siteProfile.assists ?? ''}
									class="mt-1 w-full rounded-lg border border-dark-accent/20 bg-white px-3 py-2 text-sm text-dark"
								/>
							</label>

							<button
								type="submit"
								class="col-span-2 rounded-full bg-secondary px-4 py-2 text-xs font-medium text-dark md:col-span-1"
							>
								{savedId === player.id ? 'Enregistré ✓' : 'Enregistrer'}
							</button>
						</form>
					{:else}
						<div
							class="flex flex-col gap-1 rounded-xl border border-yellow-300 bg-yellow-50 p-4 text-sm sm:flex-row sm:items-center sm:justify-between"
						>
							<span class="font-medium text-dark">{player.first_name} {player.last_name}</span>
							<span class="text-xs text-yellow-800">
								Aucune fiche du site (Players) avec ce nom : crée-la ou corrige son nom dans
								Directus.
							</span>
						</div>
					{/if}
				{/each}
			</div>
		</div>
	{:else}
		<div
			class="rounded-2xl bg-white p-5 shadow-sm print:bg-transparent print:p-0 print:shadow-none"
		>
			<div class="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div class="flex flex-wrap items-center gap-3">
					{#if viewMode === 'talent_days' || viewMode === 'academie'}
						<h1 class="font-clash text-xl text-dark sm:text-2xl">Inscription</h1>
						<select
							value={viewMode}
							onchange={(e) => changeView(e.currentTarget.value)}
							class="rounded-xl border border-dark-accent/10 bg-[#f4f5f7] px-3 py-2 text-sm text-dark print:hidden"
						>
							<option value="talent_days">Talent Day ({talentDayPlayers.length})</option>
							<option value="academie">Rejoindre l'académie ({academiePlayers.length})</option>
						</select>
					{:else}
						<h1 class="font-clash text-xl text-dark sm:text-2xl">
							Joueurs inscrits ({acceptedPlayers.length})
						</h1>
					{/if}

					<select
						bind:value={genderFilter}
						class="rounded-xl border border-dark-accent/10 bg-[#f4f5f7] px-3 py-2 text-sm text-dark print:hidden"
					>
						<option value="all">Tous les genres</option>
						<option value="fille">Femmes</option>
						<option value="garcon">Hommes</option>
					</select>
				</div>

				<div class="flex items-center gap-2 print:hidden">
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
							<button
								type="button"
								onclick={() => {
									addError = '';
								showAdd = true;
							}}
							title="Ajouter un joueur au Talent Day"
							aria-label="Ajouter un joueur au Talent Day"
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

			{#if data.loadError}
				<p class="mb-6 rounded-xl bg-red-100 px-4 py-3 text-sm text-red-700">
					Impossible de charger les inscriptions depuis Directus.
				</p>
			{:else if filteredPlayers.length === 0}
				<p class="rounded-xl bg-[#f4f5f7] px-4 py-3 text-sm text-dark-accent">
					Aucune entrée dans cette liste.
				</p>
			{/if}

			<!-- Vue cartes : mobile -->
			<div class="flex flex-col gap-4 md:hidden print:hidden">
				{#each filteredPlayers as player (player.id)}
					<div
						class="rounded-xl border border-dark-accent/10 p-4 transition-shadow hover:shadow-sm"
					>
						<div class="mb-2 flex items-start justify-between gap-2">
							<div class="flex items-center gap-3">
								<span
									class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary"
								>
									{initials(player)}
								</span>
								<div>
									<p class="font-medium text-dark">{player.first_name} {player.last_name}</p>
									<p class="text-xs text-dark-accent">{player.email}</p>
									{@render resendButton(player)}{@render reminderButton(player)}
									{#if cleanInstagram(player.instagram)}
										<a
											href={`https://instagram.com/${cleanInstagram(player.instagram)}`}
											target="_blank"
											rel="noopener noreferrer"
											class="text-xs font-medium text-primary underline"
											>@{cleanInstagram(player.instagram)}</a
										>
									{/if}
								</div>
							</div>
							<span class="shrink-0 rounded-full bg-[#f4f5f7] px-2 py-1 text-xs text-dark-accent">
								{genderLabel(player.gender)}
							</span>
						</div>

						<div class="mb-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-dark-accent">
							<span
								>Naissance : {@render valueOrMissing(
									player.birth_date ? formatDate(player.birth_date) : null
								)}</span
							>
							<span>Poste : {@render valueOrMissing(player.preferred_position)}</span>
							<span>Tél : {@render valueOrMissing(player.phone)}</span>
							<span>Club : {@render valueOrMissing(player.current_club)}</span>
							<span
								>Division : {@render valueOrMissing(
									player.division ? divisionLabel(player.division) : null
								)}</span
							>
							{#if player.type === 'academie' || player.status === 'accepted'}
								<span>Lieu de naissance : {@render valueOrMissing(player.birth_place)}</span>
								<span>Nationalité : {@render valueOrMissing(player.nationality)}</span>
								<span class="col-span-2">Adresse : {@render valueOrMissing(player.address)}</span>
								<span>Code postal : {@render valueOrMissing(player.postal_code)}</span>
							{/if}
						</div>

						<div class="mb-3">
							{#if player.complete}
								<span class="rounded-full bg-green-100 px-2 py-1 text-xs text-green-700">Oui</span>
							{:else}
								<span
									class="rounded-full bg-red-100 px-2 py-1 text-xs text-red-700"
									title={player.missing.join(', ')}>Non</span
								>
							{/if}
						</div>

						{#if player.id_card_front || player.id_card_back}
							<div class="mb-3">{@render idCardButtons(player)}</div>
						{/if}

						<div class="flex items-center gap-2">
							<div class="flex-1">{@render statusSelect(player)}{@render venueSelect(player)}</div>
							<button
								type="button"
								onclick={() => (editingId = editingId === player.id ? null : player.id)}
								class="rounded-xl bg-[#f4f5f7] px-3 py-1.5 text-xs text-dark-accent"
							>
								Modifier
							</button>
						</div>

						{@render extraPanel(player)}

						{#if editingId === player.id}
							{@render editForm(player)}
						{/if}
					</div>
				{/each}
			</div>

			<!-- Vue tableau : desktop + impression -->
			<div
				class="hidden overflow-x-auto rounded-xl border border-dark-accent/10 md:block print:block print:border-none"
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
			<h2 class="font-clash mb-4 text-lg text-dark">Ajouter un joueur (Talent Day)</h2>
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
