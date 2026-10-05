<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	let editingId = $state<number | null>(null);
	let genderFilter = $state<'all' | 'fille' | 'garcon'>('all');

	let viewMode = $derived(
		(page.url.searchParams.get('view') as
			'overview' | 'talent_days' | 'academie' | 'inscrits' | 'stats') ?? 'overview'
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

	function genderLabel(g: string | null) {
		if (g === 'fille') return 'Femme';
		if (g === 'garcon') return 'Homme';
		return '—';
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

	let femaleCount = $derived(data.players.filter((p: any) => p.gender === 'fille').length);
	let maleCount = $derived(data.players.filter((p: any) => p.gender === 'garcon').length);
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
		genderFilter === 'all'
			? baseFiltered
			: baseFiltered.filter((p: any) => p.gender === genderFilter)
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
				(genderFilter === 'all' || p.gender === genderFilter) &&
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
			onchange={(e) => e.currentTarget.form?.requestSubmit()}
			class="w-full min-w-32.5 rounded-full border px-3 py-2 text-sm font-medium {statusClasses(
				player.status
			)}"
		>
			<option value="pending">En attente</option>
			<option value="accepted">Accepté</option>
			<option value="rejected">Refusé</option>
		</select>
	</form>
	<span class="hidden text-sm font-medium print:inline">{statusLabel(player.status)}</span>
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

				<button
					type="button"
					onclick={() => window.print()}
					class="rounded-xl bg-[#f4f5f7] px-4 py-2 text-sm text-dark-accent transition-colors hover:bg-dark-accent/10 print:hidden"
				>
					Imprimer la liste
				</button>
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
							<div class="flex-1">{@render statusSelect(player)}</div>
							<button
								type="button"
								onclick={() => (editingId = editingId === player.id ? null : player.id)}
								class="rounded-xl bg-[#f4f5f7] px-3 py-1.5 text-xs text-dark-accent"
							>
								Modifier
							</button>
						</div>

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
									>{player.email}</td
								>
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
									>{@render statusSelect(player)}</td
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
							{#if editingId === player.id}
								<tr class="border-t border-dark-accent/10 print:hidden">
									<td colspan="14" class="px-5 pb-4">{@render editForm(player)}</td>
								</tr>
							{/if}
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	{/if}
</div>

<style>
	@media print {
		@page {
			size: landscape;
			margin: 1cm;
		}
	}
</style>
