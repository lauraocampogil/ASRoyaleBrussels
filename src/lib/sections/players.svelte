<!-- Players.svelte -->
<script lang="ts">
	import { Tagline } from '$lib/components';
	import { reveal } from '$lib/actions/reveal';

	let { eyebrow, title, description, players = [] }: any = $props();

	let activeGender = $state('male');
	let nameRange = $state('all');
	let positionFilter = $state('all');
	let countryFilter = $state('all');
	let clubFilter = $state('all');

	function surname(fullName: string) {
		const parts = (fullName ?? '').trim().split(/\s+/);
		return parts[parts.length - 1] ?? '';
	}

	let genderPlayers = $derived(players.filter((p: any) => p.gender === activeGender));

	const nameRanges = ['all', 'A-D', 'E-H', 'I-L', 'M-P', 'Q-T', 'U-Z'];
	const positions = [
		{ label: 'Gardien', value: 'gardien' },
		{ label: 'Défenseur', value: 'defenseur' },
		{ label: 'Milieu', value: 'milieu' },
		{ label: 'Attaquant', value: 'attaquant' }
	];

	let countryOptions = $derived(
		[...new Set(genderPlayers.map((p: any) => p.country).filter(Boolean))].sort()
	);
	let clubOptions = $derived(
		[...new Set(genderPlayers.map((p: any) => p.club).filter(Boolean))].sort()
	);

	function inRange(letter: string, range: string) {
		if (range === 'all') return true;
		const [start, end] = range.split('-');
		return letter >= start && letter <= end;
	}

	let filteredPlayers = $derived(
		genderPlayers.filter((p: any) => {
			const letter = surname(p.name)[0]?.toUpperCase() ?? '';
			if (!inRange(letter, nameRange)) return false;
			if (positionFilter !== 'all' && p.position !== positionFilter) return false;
			if (countryFilter !== 'all' && p.country !== countryFilter) return false;
			if (clubFilter !== 'all' && p.club !== clubFilter) return false;
			return true;
		})
	);

	let displayedPlayers = $derived(
		[...filteredPlayers].sort((a, b) => surname(a.name).localeCompare(surname(b.name)))
	);

	let selected: any = $state(null);
	let flipped = $state(false);
	let modalOpen = $state(false);
	let listHovered = $state(false);

	$effect(() => {
		selected = displayedPlayers[0] ?? null;
		flipped = false;
	});

	function flagEmoji(code: string) {
		if (!code) return '';
		return code
			.toUpperCase()
			.replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)));
	}

	function handleRowEnter(player: any) {
		selected = player;
		listHovered = true;
	}

	function handleListLeave() {
		listHovered = false;
	}

	function handlePhotoEnter() {
		flipped = true;
	}

	function handlePhotoLeave() {
		flipped = false;
	}

	function setGender(g: string) {
		activeGender = g;
	}

	function openModal() {
		modalOpen = true;
	}

	function closeModal() {
		modalOpen = false;
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') closeModal();
	}

	$effect(() => {
		document.documentElement.style.overflow = modalOpen ? 'hidden' : '';
		document.body.style.overflow = modalOpen ? 'hidden' : '';

		return () => {
			document.documentElement.style.overflow = '';
			document.body.style.overflow = '';
		};
	});
</script>

<svelte:window onkeydown={handleKeydown} />

<section
	data-header-theme="light"
	id="players"
	class="grid-section sm-grid-section bg-background px-5 py-16 sm:px-8 md:px-10 lg:px-12 xl:py-24 3xl:container 3xl:mx-auto"
>
	<div use:reveal class="col-span-8 mb-8 flex flex-col gap-y-4 md:mb-10 md:col-span-5">
		{#if eyebrow}
			<Tagline text={eyebrow} />
		{/if}
		<h2
			class="text-mobile-title-xl font-semibold font-clash uppercase text-primary md:text-title-2xl"
		>
			{title}
		</h2>
		{#if description}
			<p class="text-mobile-body font-jakarta text-dark md:text-body">{description}</p>
		{/if}
	</div>

	<div class="col-span-8 mb-6 inline-flex w-fit overflow-hidden rounded-md md:mb-8">
		<button
			type="button"
			onclick={() => setGender('male')}
			class="text-button px-5 py-2.5 transition-colors sm:px-6 sm:py-3 {activeGender === 'male'
				? 'bg-primary font-bold text-white'
				: 'bg-dark/5 text-dark hover:bg-dark/10'}"
		>
			Hommes
		</button>
		<button
			type="button"
			onclick={() => setGender('female')}
			class="text-button px-5 py-2.5 transition-colors sm:px-6 sm:py-3 {activeGender === 'female'
				? 'bg-primary font-bold text-white'
				: 'bg-dark/5 text-dark hover:bg-dark/10'}"
		>
			Femmes
		</button>
	</div>

	<!-- Liste mobile -->
	<div class="col-span-8 flex flex-col lg:hidden">
		{#each displayedPlayers as player, i (player.id)}
			<div
				class="border-t border-dark/10 py-4 {i === displayedPlayers.length - 1 ? 'border-b' : ''}"
			>
				<div class="flex items-center justify-between gap-3">
					<div class="flex min-w-0 items-center gap-2">
						{#if player.highlight_video}
							<span
								class="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-dark text-white"
							>
								<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24"
									><path fill="currentColor" d="M8 5v14l11-7z" /></svg
								>
							</span>
						{/if}
						<span class="truncate text-sm font-bold uppercase text-primary">{player.name}</span>
					</div>
					<span class="shrink-0 text-xs font-medium uppercase text-dark/50">{player.country}</span>
				</div>
				<div class="mt-2 flex items-center gap-2 pl-8">
					{#if player.club_logo}
						<img src={player.club_logo} alt="" class="h-5 w-5 shrink-0 object-contain" />
					{/if}
					<span class="truncate text-xs text-dark/70">{player.club}</span>
				</div>
			</div>
		{/each}
	</div>

	<!-- Vue desktop -->
	<div class="col-span-8 hidden grid-cols-[360px_1fr] items-start gap-8 lg:grid">
		<div
			class="group sticky top-24 h-115"
			style="perspective: 1400px;"
			onmouseenter={handlePhotoEnter}
			onmouseleave={handlePhotoLeave}
			role="presentation"
		>
			{#if selected}
				<div class="flip-card h-full w-full" class:flipped>
					<div class="flip-card-inner h-full w-full rounded-lg">
						<div class="flip-card-face flip-card-front">
							<img src={selected.photo} alt={selected.name} class="h-full w-full object-cover" />
						</div>
						<div class="flip-card-face flip-card-back flex flex-col justify-between bg-primary p-6">
							<div>
								<h3 class="text-title-md font-clash mb-4 text-white uppercase">{selected.name}</h3>
								<div class="grid grid-cols-2 gap-5">
									<div>
										<span class="block text-xs text-white/50 uppercase">Buts</span>
										<span class="text-title-md font-clash text-white">{selected.goals ?? '-'}</span>
									</div>
									<div>
										<span class="block text-xs text-white/50 uppercase">Passes D.</span>
										<span class="text-title-md font-clash text-white"
											>{selected.assists ?? '-'}</span
										>
									</div>
									<div>
										<span class="block text-xs text-white/50 uppercase">Matchs</span>
										<span class="text-title-md font-clash text-white">{selected.games ?? '-'}</span>
									</div>
									<div>
										<span class="block text-xs text-white/50 uppercase">Pied fort</span>
										<span class="text-title-md font-clash text-white capitalize"
											>{selected.foot ?? '-'}</span
										>
									</div>
									<div>
										<span class="block text-xs text-white/50 uppercase">Taille</span>
										<span class="text-title-md font-clash text-white"
											>{selected.height ? `${selected.height} cm` : '-'}</span
										>
									</div>
								</div>
							</div>

							{#if selected.highlight_video}
								<button
									type="button"
									onclick={openModal}
									class="text-button mt-6 self-start rounded bg-white px-4 py-2 text-primary uppercase transition-opacity hover:opacity-90"
								>
									Play video highlight
								</button>
							{/if}
						</div>
					</div>
				</div>
			{/if}
		</div>

		<table class="w-full border-collapse">
			<thead>
				<tr>
					<th class="pb-3 text-left font-normal">
						<select
							bind:value={nameRange}
							class="border-none bg-transparent text-xs tracking-wide text-dark/40 uppercase focus:outline-none"
						>
							{#each nameRanges as range}
								<option value={range}>{range === 'all' ? 'Nom' : range}</option>
							{/each}
						</select>
					</th>
					<th class="pb-3 text-left font-normal">
						<select
							bind:value={positionFilter}
							class="border-none bg-transparent text-xs tracking-wide text-dark/40 uppercase focus:outline-none"
						>
							<option value="all">Position</option>
							{#each positions as pos}
								<option value={pos.value}>{pos.label}</option>
							{/each}
						</select>
					</th>
					<th class="pb-3 text-left font-normal">
						<select
							bind:value={countryFilter}
							class="border-none bg-transparent text-xs tracking-wide text-dark/40 uppercase focus:outline-none"
						>
							<option value="all">Pays</option>
							{#each countryOptions as c}
								<option value={c}>{c}</option>
							{/each}
						</select>
					</th>
					<th class="pb-3 text-left font-normal">
						<select
							bind:value={clubFilter}
							class="border-none bg-transparent text-xs tracking-wide text-dark/40 uppercase focus:outline-none"
						>
							<option value="all">Club</option>
							{#each clubOptions as c}
								<option value={c}>{c}</option>
							{/each}
						</select>
					</th>
				</tr>
			</thead>
			<tbody onmouseleave={handleListLeave}>
				{#each displayedPlayers as player (player.id)}
					<tr
						class="cursor-pointer transition-[opacity,background-color] hover:bg-dark/3 {listHovered &&
						selected?.id !== player.id
							? 'opacity-40'
							: 'opacity-100'}"
						onmouseenter={() => handleRowEnter(player)}
					>
						<td class="border-b border-dotted border-dark/20 py-4 align-middle">
							<span class="text-body-sm font-jakarta font-semibold text-primary">{player.name}</span
							>
						</td>
						<td class="border-b border-dotted border-dark/20 py-4 align-middle">
							<span class="text-body-sm font-jakarta text-dark capitalize">{player.position}</span>
						</td>
						<td class="border-b border-dotted border-dark/20 py-4 align-middle">
							<span class="text-body-sm font-jakarta flex items-center gap-2 text-dark">
								<span aria-hidden="true">{flagEmoji(player.country_code)}</span>
								{player.country}
							</span>
						</td>
						<td class="border-b border-dotted border-dark/20 py-4 align-middle">
							<span class="text-body-sm font-jakarta flex items-center gap-2 text-dark">
								{#if player.club_logo}
									<img src={player.club_logo} alt="" class="h-4 w-4 object-contain" />
								{/if}
								{player.club}
							</span>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</section>

{#if modalOpen && selected?.highlight_video}
	<div
		class="fixed inset-0 z-100 flex items-center justify-center bg-black/80 p-6"
		onclick={closeModal}
		role="presentation"
	>
		<button
			type="button"
			onclick={closeModal}
			class="absolute top-6 right-6 text-2xl text-white transition-opacity hover:opacity-70"
			aria-label="Fermer"
		>
			✕
		</button>
		<video
			src={selected.highlight_video}
			controls
			autoplay
			playsinline
			onclick={(e) => e.stopPropagation()}
			class="max-h-[85vh] max-w-4xl rounded-[10px]"
		></video>
	</div>
{/if}

<style>
	.flip-card {
		perspective: 1400px;
	}
	.flip-card-inner {
		position: relative;
		transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
		transform-style: preserve-3d;
	}
	.flip-card.flipped .flip-card-inner {
		transform: rotateY(180deg);
	}
	.flip-card-face {
		position: absolute;
		inset: 0;
		overflow: hidden;
		border-radius: 10px;
		backface-visibility: hidden;
	}
	.flip-card-back {
		transform: rotateY(180deg);
	}
</style>
