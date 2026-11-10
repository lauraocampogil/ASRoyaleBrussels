<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { DOSSIER_SECTIONS, MONTH_LABELS, FEES } from '$lib/dossier';

	let { data } = $props();

	const STAGES = [
		{ key: 'complete', group: 'academie', label: "Membres — dossier complet", short: 'Membres', dot: 'bg-green-500', badge: 'bg-green-100 text-green-800', bar: 'border-l-green-500' },
		{ key: 'accepted', group: 'academie', label: 'Acceptés — dossier à compléter', short: 'Dossier à compléter', dot: 'bg-blue-500', badge: 'bg-blue-100 text-blue-800', bar: 'border-l-blue-500' },
		{ key: 'pending', group: 'autres', label: 'À traiter', short: 'À traiter', dot: 'bg-amber-400', badge: 'bg-amber-100 text-amber-800', bar: 'border-l-amber-400' },
		{ key: 'absent', group: 'autres', label: 'Pas venus', short: 'Pas venus', dot: 'bg-gray-400', badge: 'bg-gray-200 text-gray-700', bar: 'border-l-gray-400' },
		{ key: 'archived', group: 'autres', label: 'Archivés', short: 'Archivés', dot: 'bg-gray-300', badge: 'bg-gray-100 text-gray-500', bar: 'border-l-gray-200' },
		{ key: 'rejected', group: 'autres', label: 'Refusés', short: 'Refusés', dot: 'bg-red-400', badge: 'bg-red-100 text-red-700', bar: 'border-l-red-400' }
	];

	let search = $state('');
	let stageFilter = $state('complete');
	let typeFilter = $state('all');
	let view = $state<'cartes' | 'liste' | 'pipeline'>('cartes');
	let tab = $state<'resume' | 'dossier' | 'paiements' | 'presences'>('resume');

	const norm = (s: string) =>
		(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

	let filtered = $derived(
		data.players.filter(
			(p: any) =>
				p.stage === stageFilter &&
				(typeFilter === 'all' || p.type === typeFilter) &&
				norm(`${p.first_name} ${p.last_name} ${p.email}`).includes(norm(search.trim()))
		)
	);

	let pipeItems = $derived(
		data.players.filter(
			(p: any) =>
				(typeFilter === 'all' || p.type === typeFilter) &&
				norm(`${p.first_name} ${p.last_name} ${p.email}`).includes(norm(search.trim()))
		)
	);
	const PAGE_SIZE = 10;
	const thisMonthKey = new Date().toISOString().slice(0, 7);
	const monthPaid = (p: any) => (p.paiements as any[]).some((e) => e.type === 'mensuel' && e.mois === thisMonthKey);
	function presRate(p: any) {
		const v = Object.values(p.presences as Record<string, string>);
		const n = v.length;
		return n ? Math.round((v.filter((x) => x === 'present').length / n) * 100) : null;
	}
	let pageNum = $state(1);
	let pageCount = $derived(Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)));
	let pageItems = $derived(filtered.slice((pageNum - 1) * PAGE_SIZE, pageNum * PAGE_SIZE));
	$effect(() => {
		search; stageFilter; typeFilter;
		pageNum = 1;
	});

	let counts = $derived(
		Object.fromEntries(STAGES.map((s) => [s.key, data.players.filter((p: any) => p.stage === s.key).length]))
	);

	let selectedId = $derived(page.url.searchParams.get('joueur'));
	let selected = $derived(data.players.find((p: any) => String(p.id) === selectedId) ?? null);

	function open(p: any, t: typeof tab = 'resume') {
		tab = t;
		goto(`?joueur=${p.id}`, { noScroll: true, keepFocus: true });
	}
	function close() {
		goto('?', { noScroll: true });
	}

	const isFemale = (g: string) =>
		['fille', 'femme', 'female', 'f', 'girl', 'woman'].includes((g ?? '').toLowerCase());

	function age(d: string) {
		if (!d) return null;
		const b = new Date(d);
		return Math.floor((Date.now() - b.getTime()) / 31557600000);
	}
	function fmtDate(d: string) {
		if (!d) return '—';
		return new Date(d).toLocaleDateString('fr-BE', { day: '2-digit', month: 'short', year: 'numeric' });
	}
	function initials(p: any) {
		return `${p.first_name?.[0] ?? ''}${p.last_name?.[0] ?? ''}`.toUpperCase();
	}
	function stageOf(p: any) {
		return STAGES.find((s) => s.key === p.stage)!;
	}
	function show(v: any) {
		if (v === true) return 'Oui';
		if (v === false) return 'Non';
		if (v === null || v === undefined || v === '') return '—';
		return String(v);
	}
	function fee(p: any) {
		return isFemale(p.gender) ? FEES.monthly.fille : FEES.monthly.garcon;
	}
	function presenceList(p: any) {
		return Object.entries(p.presences as Record<string, string>).sort((a, b) => b[0].localeCompare(a[0]));
	}
	function monthLabel(m: string) {
		if (!m) return '';
		const [y, mo] = m.split('-');
		return `${MONTH_LABELS[Number(mo) - 1]} ${y}`;
	}
	let today = new Date().toISOString().slice(0, 10);
	let thisMonth = today.slice(0, 7);
	let payType = $state('mensuel');
</script>

<div class="space-y-3">
	<header class="flex flex-wrap items-end justify-between gap-3">
		<div></div>
		<div class="flex max-w-full overflow-x-auto rounded-full bg-white p-1 shadow-sm">
			{#each [['cartes', 'Cartes'], ['liste', 'Liste'], ['pipeline', 'Pipeline']] as [k, l]}
				<button
					onclick={() => (view = k as any)}
					class="whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium {view === k ? 'bg-dark text-white' : 'text-dark-accent'}"
					>{l}</button
				>
			{/each}
		</div>
	</header>

	{#if data.loadError}
		<p class="rounded-xl bg-red-50 p-4 text-sm text-red-700">Impossible de charger les joueurs.</p>
	{/if}

	<!-- Onglets : académie d'abord, le reste ensuite -->
	<select value={stageFilter} onchange={(e) => (stageFilter = e.currentTarget.value)} class="w-full rounded-xl border border-dark-accent/10 bg-white px-4 py-2 text-sm text-dark shadow-sm md:hidden">
		{#each STAGES as s}<option value={s.key}>{s.short} ({counts[s.key]})</option>{/each}
	</select>
	<div class="hidden flex-wrap items-center gap-2 md:flex">
		{#each STAGES as s, i}
			{#if i > 0 && STAGES[i - 1].group !== s.group}
				<span class="mx-1 h-6 w-px bg-dark-accent/20"></span>
			{/if}
			<button
				onclick={() => (stageFilter = s.key)}
				class="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium {stageFilter === s.key
					? 'bg-dark text-white'
					: s.group === 'academie'
						? 'bg-white text-dark shadow-sm hover:bg-[#eceef1]'
						: 'bg-transparent text-dark-accent hover:bg-white'}"
			>
				<span class="h-2 w-2 rounded-full {s.dot}"></span>{s.short}
				<span class="opacity-60">{counts[s.key]}</span>
			</button>
		{/each}
	</div>

	<div class="flex flex-wrap gap-3">
		<input
			bind:value={search}
			placeholder="Rechercher un nom ou un email…"
			class="min-w-60 flex-1 rounded-xl border border-dark-accent/10 bg-white px-4 py-2 text-sm"
		/>
		<select bind:value={typeFilter} class="rounded-xl border border-dark-accent/10 bg-white px-4 py-2 text-sm text-dark shadow-sm">
			<option value="all">Tous</option>
			<option value="academie">Faire un essai</option>
			<option value="talent_days">Talent Day</option>
		</select>
	</div>

	{#if view === 'cartes'}
		<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
			{#each pageItems as p (p.id)}
				{@const rate = presRate(p)}
				<button
					onclick={() => open(p)}
					class="flex flex-col rounded-2xl border-t-4 bg-white p-3.5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md {stageOf(p).bar.replace('border-l-', 'border-t-')}"
				>
					<div class="flex items-center gap-3">
						<span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-dark text-xs font-semibold text-white">{initials(p)}</span>
						<div class="min-w-0">
							<p class="font-clash truncate text-sm text-dark">{p.first_name} {p.last_name}</p>
							<p class="truncate text-xs text-dark-accent">
								{[p.preferred_position, age(p.birth_date) ? `${age(p.birth_date)} ans` : null].filter(Boolean).join(' · ') || '—'}
							</p>
						</div>
					</div>
					<p class="mt-2 truncate text-xs text-dark-accent">{p.current_club ?? '—'}</p>
					<div class="mt-2 flex flex-wrap gap-1">
						<span class="rounded-full bg-[#f4f5f7] px-2.5 py-1 text-[11px] text-dark-accent">{p.type === 'talent_days' ? 'Talent Day' : 'Faire un essai'}</span>
						{#if p.stage === 'accepted'}
							<span class="rounded-full bg-blue-100 px-2.5 py-1 text-[11px] font-medium text-blue-800">Formulaire en attente</span>
						{/if}
						{#if p.venue === true}<span class="rounded-full bg-green-100 px-2.5 py-1 text-[11px] font-medium text-green-700">Venu</span>{/if}
						{#if p.venue === false}<span class="rounded-full bg-red-100 px-2.5 py-1 text-[11px] font-medium text-red-600">Pas venu</span>{/if}
					</div>
					{#if p.stage === 'complete'}
						<div class="mt-2 grid grid-cols-2 gap-2 border-t border-dark-accent/10 pt-2 text-xs">
							<div>
								<p class="text-dark-accent">Mois en cours</p>
								<p class="font-medium {monthPaid(p) ? 'text-green-700' : 'text-amber-600'}">{monthPaid(p) ? '✓ Payé' : 'À payer'}</p>
							</div>
							<div>
								<p class="text-dark-accent">Présence</p>
								<p class="font-medium {rate === null ? 'text-dark-accent' : rate >= 75 ? 'text-green-700' : rate >= 50 ? 'text-amber-600' : 'text-red-600'}">{rate === null ? '—' : `${rate}%`}</p>
							</div>
						</div>
					{/if}
				</button>
			{:else}
				<p class="col-span-full rounded-2xl bg-white p-8 text-center text-sm text-dark-accent shadow-sm">Aucun joueur.</p>
			{/each}
		</div>
		{#if pageCount > 1}
			<div class="flex items-center justify-between text-sm text-dark-accent">
				<span>{(pageNum - 1) * PAGE_SIZE + 1}–{Math.min(pageNum * PAGE_SIZE, filtered.length)} sur {filtered.length}</span>
				<div class="flex gap-1">
					<button disabled={pageNum === 1} onclick={() => pageNum--} class="rounded-lg bg-white px-3 py-1.5 disabled:opacity-40">←</button>
					{#each Array(pageCount) as _, i}
						<button onclick={() => (pageNum = i + 1)} class="rounded-lg px-3 py-1.5 {pageNum === i + 1 ? 'bg-dark text-white' : 'bg-white'}">{i + 1}</button>
					{/each}
					<button disabled={pageNum === pageCount} onclick={() => pageNum++} class="rounded-lg bg-white px-3 py-1.5 disabled:opacity-40">→</button>
				</div>
			</div>
		{/if}
	{:else if view === 'liste'}
		<div class="overflow-x-auto rounded-2xl bg-white shadow-sm">
			<table class="w-full text-left text-sm">
				<thead class="border-b border-dark-accent/10 text-xs uppercase text-dark-accent">
					<tr>
						<th class="px-4 py-3">Joueur</th>
						<th class="px-4 py-3">Étape</th>
						<th class="hidden px-4 py-3 md:table-cell">Origine</th>
						<th class="hidden px-4 py-3 lg:table-cell">Club</th>
						<th class="hidden px-4 py-3 lg:table-cell">Reçu le</th>
					</tr>
				</thead>
				<tbody>
					{#each pageItems as p (p.id)}
						<tr
							onclick={() => open(p)}
							class="cursor-pointer border-b border-dark-accent/5 last:border-0 hover:bg-[#f4f5f7] {selectedId === String(p.id) ? 'bg-[#f4f5f7]' : ''}"
						>
							<td class="border-l-4 px-4 py-2 {stageOf(p).bar}">
								<div class="flex items-center gap-3">
									<span class="flex h-9 w-9 items-center justify-center rounded-full bg-dark text-xs font-semibold text-white">{initials(p)}</span>
									<div>
										<div class="font-medium text-dark">{p.first_name} {p.last_name}</div>
										<div class="text-xs text-dark-accent">{p.email}</div>
									</div>
								</div>
							</td>
							<td class="px-4 py-2">
								<span class="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium {stageOf(p).badge}">
									<span class="h-2 w-2 rounded-full {stageOf(p).dot}"></span>{stageOf(p).short}
								</span>
							</td>
							<td class="hidden px-4 py-3 md:table-cell">{p.type === 'talent_days' ? 'Talent Day' : 'Faire un essai'}</td>
							<td class="hidden px-4 py-3 lg:table-cell">{p.current_club ?? '—'}</td>
							<td class="hidden px-4 py-3 lg:table-cell">{fmtDate(p.date_created)}</td>
						</tr>
					{:else}
						<tr><td colspan="5" class="px-4 py-8 text-center text-dark-accent">Aucun joueur.</td></tr>
					{/each}
				</tbody>
			</table>
		</div>
		{#if pageCount > 1}
			<div class="flex items-center justify-between text-sm text-dark-accent">
				<span>{(pageNum - 1) * PAGE_SIZE + 1}–{Math.min(pageNum * PAGE_SIZE, filtered.length)} sur {filtered.length}</span>
				<div class="flex gap-1">
					<button disabled={pageNum === 1} onclick={() => pageNum--} class="rounded-lg bg-white px-3 py-1.5 disabled:opacity-40">←</button>
					{#each Array(pageCount) as _, i}
						<button onclick={() => (pageNum = i + 1)} class="rounded-lg px-3 py-1.5 {pageNum === i + 1 ? 'bg-dark text-white' : 'bg-white'}">{i + 1}</button>
					{/each}
					<button disabled={pageNum === pageCount} onclick={() => pageNum++} class="rounded-lg bg-white px-3 py-1.5 disabled:opacity-40">→</button>
				</div>
			</div>
		{/if}
	{:else}
		<div class="grid gap-4 lg:grid-cols-5">
			{#each STAGES.filter((x) => x.key !== 'archived') as s}
				<section class="rounded-2xl bg-[#eceef1] p-3">
					<h2 class="flex items-center gap-2 px-1 text-sm font-semibold text-dark">
						<span class="h-2 w-2 rounded-full {s.dot}"></span>{s.label}
						<span class="ml-auto text-dark-accent">{pipeItems.filter((p: any) => p.stage === s.key).length}</span>
					</h2>
					<div class="mt-3 space-y-2">
						{#each pipeItems.filter((p: any) => p.stage === s.key).slice(0, 10) as p (p.id)}
							<button onclick={() => open(p)} class="w-full rounded-xl border-l-4 bg-white p-3 text-left shadow-sm hover:shadow {s.bar}">
								<div class="text-sm font-medium text-dark">{p.first_name} {p.last_name}</div>
								<div class="text-xs text-dark-accent">{p.current_club ?? '—'} · {p.preferred_position ?? '—'}</div>
							</button>
						{/each}
						{#if pipeItems.filter((p: any) => p.stage === s.key).length > 10}
							<button onclick={() => { stageFilter = s.key; view = 'liste'; }} class="w-full rounded-xl py-2 text-xs font-medium text-dark-accent hover:bg-white">
								Voir les {pipeItems.filter((p: any) => p.stage === s.key).length} →
							</button>
						{/if}
					</div>
				</section>
			{/each}
		</div>
	{/if}
</div>

<!-- Fiche joueur -->
{#if selected}
	{@const p = selected}
	<div class="fixed inset-0 z-40 flex justify-end bg-black/40" role="presentation" onclick={close}>
		<aside
			class="flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl"
			role="dialog"
			tabindex="-1"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.key === 'Escape' && close()}
		>
			<div class="border-b border-dark-accent/10 p-5">
				<div class="flex items-start gap-4">
					<span class="flex h-14 w-14 items-center justify-center rounded-full bg-dark text-lg font-semibold text-white">{initials(p)}</span>
					<div class="flex-1">
						<h2 class="text-xl font-semibold text-dark">{p.first_name} {p.last_name}</h2>
						<p class="text-sm text-dark-accent">
							{[p.preferred_position, age(p.birth_date) ? `${age(p.birth_date)} ans` : null, p.current_club].filter(Boolean).join(' · ')}
						</p>
						<span class="mt-2 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium {stageOf(p).badge}">
							<span class="h-2 w-2 rounded-full {stageOf(p).dot}"></span>{stageOf(p).short}
						</span>
					</div>
					<button onclick={close} class="rounded-full p-2 text-dark-accent hover:bg-[#f4f5f7]" aria-label="Fermer">✕</button>
				</div>

				<div class="mt-4 flex flex-wrap gap-2">
					<form method="POST" action="/admin?/updateStatus" use:enhance class="flex gap-2">
						<input type="hidden" name="id" value={p.id} />
						<select name="status" value={p.status} class="rounded-xl border border-dark-accent/10 px-3 py-2 text-sm">
							<option value="pending">En attente</option>
							<option value="accepted">Accepté (envoie l'email)</option>
							<option value="rejected">Refusé (envoie l'email)</option>
						</select>
						<button class="rounded-xl bg-dark px-4 py-2 text-sm font-medium text-white"
							onclick={(e) => { if (!confirm('Changer le statut peut envoyer un email au joueur. Continuer ?')) e.preventDefault(); }}
							>Appliquer</button>
					</form>
					{#if p.status !== 'accepted' && (p.stage !== 'archived' || p.archived === true)}
						<form method="POST" action="/admin?/archivePlayer" use:enhance={() => async ({ result, update }) => {
							if (result.type === 'failure') alert(String((result.data as any)?.error ?? 'Erreur'));
							await update({ reset: false });
						}}>
							<input type="hidden" name="id" value={p.id} />
							<input type="hidden" name="archived" value={p.stage === 'archived' ? 'false' : 'true'} />
							<button class="rounded-xl bg-[#f4f5f7] px-4 py-2 text-sm font-medium text-dark-accent hover:bg-[#eceef1]">{p.stage === 'archived' ? 'Désarchiver' : 'Archiver'}</button>
						</form>
					{/if}
					{#if true}
						<form method="POST" action="/admin?/updateVenue" use:enhance>
							<input type="hidden" name="id" value={p.id} />
							<select
								name="venue"
								value={p.venue === true ? 'true' : p.venue === false ? 'false' : ''}
								onchange={(e) => e.currentTarget.form?.requestSubmit()}
								class="rounded-xl border px-3 py-2 text-sm font-medium {p.venue === true ? 'border-green-300 bg-green-50 text-green-700' : p.venue === false ? 'border-red-300 bg-red-50 text-red-600' : 'border-dark-accent/10'}"
							>
								<option value="">Venue : —</option>
								<option value="true">Venu</option>
								<option value="false">Pas venu</option>
							</select>
						</form>
					{/if}
				</div>

				<nav class="mt-4 flex gap-1 overflow-x-auto text-sm">
					{#each [['resume', 'Résumé'], ['dossier', 'Dossier'], ['paiements', 'Paiements'], ['presences', 'Présences']] as [k, l]}
						<button
							onclick={() => (tab = k as any)}
							class="rounded-full px-4 py-1.5 font-medium {tab === k ? 'bg-dark text-white' : 'text-dark-accent hover:bg-[#f4f5f7]'}"
							>{l}</button
						>
					{/each}
				</nav>
			</div>

			<div class="flex-1 overflow-y-auto p-5">
				{#if tab === 'resume'}
					<dl class="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
						{#each [
							['Email', p.email], ['Téléphone', p.phone], ['Instagram', p.instagram],
							['Date de naissance', fmtDate(p.birth_date)], ['Genre', p.gender], ['Poste préféré', p.preferred_position],
							['Club actuel', p.current_club], ['Division', p.division], ['Lieu de naissance', p.birth_place],
							['Nationalité', p.nationality], ['Adresse', [p.address, p.postal_code].filter(Boolean).join(', ')], ['Origine', p.type === 'talent_days' ? 'Talent Day' : 'Faire un essai']
						] as [l, v]}
							<div><dt class="text-xs uppercase text-dark-accent">{l}</dt><dd class="font-medium text-dark">{show(v)}</dd></div>
						{/each}
					</dl>
					<div class="mt-6 flex flex-wrap gap-2">
						{#if p.id_card_front}<a target="_blank" href={`/admin/id-card/${p.id_card_front}`} class="rounded-xl border border-dark-accent/10 px-3 py-2 text-sm">Carte d'identité (recto)</a>{/if}
						{#if p.id_card_back}<a target="_blank" href={`/admin/id-card/${p.id_card_back}`} class="rounded-xl border border-dark-accent/10 px-3 py-2 text-sm">Carte d'identité (verso)</a>{/if}
					</div>
				{:else if tab === 'dossier'}
					{#if !p.hasDossier}
						<div class="rounded-2xl bg-blue-50 p-5 text-sm text-blue-800">
							{p.status === 'accepted'
								? "Le joueur est accepté mais n'a pas encore rempli le formulaire de dossier."
								: "Le dossier est demandé uniquement après l'acceptation."}
						</div>
					{:else}
						<div class="space-y-5">
							{#each DOSSIER_SECTIONS as sec}
								{@const rows = sec.fields.filter(([k]) => p.dossier[k] !== undefined && p.dossier[k] !== '' && p.dossier[k] !== null)}
								{#if rows.length}
									<section class="rounded-2xl border border-dark-accent/10 p-4">
										<h3 class="mb-3 text-sm font-semibold text-dark">{sec.title}</h3>
										<dl class="space-y-3 text-sm">
											{#each rows as [k, l]}
												<div>
													<dt class="text-xs uppercase text-dark-accent">{l}</dt>
													<dd class="font-medium text-dark">
														{#if k === 'photo_club'}
															<a target="_blank" href={`/admin/id-card/${p.dossier[k]}`}>
																<img src={`/admin/id-card/${p.dossier[k]}`} alt="Photo club" class="mt-1 h-40 rounded-xl object-cover" />
															</a>
														{:else}{show(p.dossier[k])}{/if}
													</dd>
												</div>
											{/each}
										</dl>
									</section>
								{/if}
							{/each}
							<p class="text-xs text-dark-accent">Soumis le {fmtDate(p.dossier.soumis_le)}</p>
						</div>
					{/if}
				{:else if tab === 'paiements'}
					{@const total = p.paiements.reduce((s: number, e: any) => s + (e.montant ?? 0), 0)}
					<div class="mb-4 flex items-center justify-between rounded-2xl bg-[#f4f5f7] p-4 text-sm">
						<span>Total payé</span><span class="text-xl font-semibold text-dark">{total} €</span>
					</div>
					<ul class="mb-6 divide-y divide-dark-accent/10 rounded-2xl border border-dark-accent/10 text-sm">
						{#each [...p.paiements].reverse() as e}
							<li class="flex items-center justify-between px-4 py-3">
								<span>
									<span class="font-medium text-dark">{e.type === 'annuel' ? 'Cotisation annuelle' : monthLabel(e.mois)}</span>
									<span class="text-dark-accent"> · payé le {fmtDate(e.date)}</span>
								</span>
								<span class="flex items-center gap-3">
									<b>{e.montant} €</b>
									<form method="POST" action="/admin?/deletePayment" use:enhance>
										<input type="hidden" name="id" value={p.id} /><input type="hidden" name="entry" value={e.id} />
										<button class="text-xs text-red-600" onclick={(ev) => { if (!confirm('Supprimer ce paiement ?')) ev.preventDefault(); }}>Supprimer</button>
									</form>
								</span>
							</li>
						{:else}
							<li class="px-4 py-6 text-center text-dark-accent">Aucun paiement enregistré.</li>
						{/each}
					</ul>
					<form method="POST" action="/admin?/savePayments" use:enhance class="space-y-3 rounded-2xl border border-dark-accent/10 p-4 text-sm">
						<h3 class="font-semibold text-dark">Enregistrer un paiement</h3>
						<input type="hidden" name="paid" value={p.id} />
						<div class="flex flex-wrap gap-3">
							<select name="type" bind:value={payType} class="rounded-xl border border-dark-accent/10 px-3 py-2">
								<option value="mensuel">Mensualité ({fee(p)} €)</option>
								<option value="annuel">Cotisation annuelle ({FEES.annual} €)</option>
							</select>
							{#if payType === 'mensuel'}<input type="month" name="mois" value={thisMonth} class="rounded-xl border border-dark-accent/10 px-3 py-2" />{/if}
							<input type="date" name="date" value={today} required class="rounded-xl border border-dark-accent/10 px-3 py-2" />
						</div>
						<button class="rounded-xl bg-green-600 px-4 py-2 font-medium text-white">Marquer comme payé</button>
					</form>
				{:else}
					{@const list = presenceList(p)}
					{@const nb = list.filter(([, v]) => v === 'present').length}
					<div class="mb-4 grid grid-cols-3 gap-3 text-center text-sm">
						<div class="rounded-2xl bg-[#f4f5f7] p-3"><div class="text-xl font-semibold text-dark">{list.length}</div>Séances</div>
						<div class="rounded-2xl bg-green-50 p-3"><div class="text-xl font-semibold text-green-700">{nb}</div>Présent</div>
						<div class="rounded-2xl bg-red-50 p-3"><div class="text-xl font-semibold text-red-600">{list.length - nb}</div>Absent</div>
					</div>
					<ul class="mb-6 divide-y divide-dark-accent/10 rounded-2xl border border-dark-accent/10 text-sm">
						{#each list as [d, v]}
							<li class="flex items-center justify-between px-4 py-3">
								<span class="font-medium text-dark">{new Date(d).toLocaleDateString('fr-BE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
								<span class="rounded-full px-3 py-1 text-xs font-medium {v === 'present' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}">{v === 'present' ? 'Présent' : 'Absent'}</span>
							</li>
						{:else}
							<li class="px-4 py-6 text-center text-dark-accent">Aucune présence enregistrée.</li>
						{/each}
					</ul>
					<form method="POST" action="/admin?/savePresences" use:enhance class="flex flex-wrap items-end gap-3 rounded-2xl border border-dark-accent/10 p-4 text-sm">
						<label>Date<input type="date" name="date" value={today} required class="mt-1 block rounded-xl border border-dark-accent/10 px-3 py-2" /></label>
						<button name={`s_${p.id}`} value="present" class="rounded-xl bg-green-600 px-4 py-2 font-medium text-white">Présent</button>
						<button name={`s_${p.id}`} value="absent" class="rounded-xl bg-red-500 px-4 py-2 font-medium text-white">Absent</button>
					</form>
				{/if}
			</div>
		</aside>
	</div>
{/if}
