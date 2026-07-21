<!-- Players.svelte -->
<script lang="ts">
	import { Tagline } from '$lib/components';

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
	class="grid-section sm-grid-section bg-background px-5 py-16 sm:px-8 md:px-10 lg:px-12 xl:py-24 3xl:container 3xl:mx-auto"
>
	<div class="col-span-8 mb-10 flex flex-col gap-y-4 md:col-span-5">
		{#if eyebrow}
			<Tagline text={eyebrow} />
		{/if}
		<h2 class="text-title-2xl font-clash uppercase text-primary">{title}</h2>
		{#if description}
			<p class="text-body font-jakarta text-dark">{description}</p>
		{/if}
	</div>

	<div class="col-span-8 mb-8 inline-flex w-fit overflow-hidden rounded-md">
		<button
			type="button"
			onclick={() => setGender('male')}
			class="text-button px-6 py-3 transition-colors {activeGender === 'male'
				? 'bg-primary font-bold text-white'
				: 'bg-dark/5 text-dark hover:bg-dark/10'}"
		>
			Hommes
		</button>
		<button
			type="button"
			onclick={() => setGender('female')}
			class="text-button px-6 py-3 transition-colors {activeGender === 'female'
				? 'bg-primary font-bold text-white'
				: 'bg-dark/5 text-dark hover:bg-dark/10'}"
		>
			Femmes
		</button>
	</div>

	<div class="col-span-8 grid grid-cols-1 gap-8 md:grid-cols-[360px_1fr] md:items-start">
		<div
			class="group sticky top-24 hidden h-115 md:block"
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
					<th class="pb-3 text-left text-xs font-normal tracking-wide text-dark/40 uppercase">
						Contact
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
						<td class="border-b border-dotted border-dark/20 py-4 align-middle">
							<span class="flex items-center gap-3">
								{#if player.instagram}
									<a
										href={player.instagram}
										target="_blank"
										rel="noopener noreferrer"
										onclick={(e) => e.stopPropagation()}
										class="text-dark/50 transition-colors hover:text-secondary"
										aria-label="Instagram de {player.name}"
									>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											width="20"
											height="20"
											viewBox="0 0 24 24"
										>
											<path
												fill="currentColor"
												d="M18.437 20.937H5.563a2.5 2.5 0 0 1-2.5-2.5V5.563a2.5 2.5 0 0 1 2.5-2.5h12.874a2.5 2.5 0 0 1 2.5 2.5v12.874a2.5 2.5 0 0 1-2.5 2.5M5.563 4.063a1.5 1.5 0 0 0-1.5 1.5v12.874a1.5 1.5 0 0 0 1.5 1.5h12.874a1.5 1.5 0 0 0 1.5-1.5V5.563a1.5 1.5 0 0 0-1.5-1.5Z"
											/>
											<path
												fill="currentColor"
												d="M12 16.594A4.595 4.595 0 1 1 16.6 12a4.6 4.6 0 0 1-4.6 4.594M12 8.4a3.595 3.595 0 1 0 3.6 3.6A3.6 3.6 0 0 0 12 8.4"
											/>
											<circle cx="17.2" cy="6.83" r="1.075" fill="currentColor" />
										</svg>
									</a>
								{/if}
								{#if player.email}
									<a
										href="mailto:{player.email}"
										onclick={(e) => e.stopPropagation()}
										class="text-dark/50 transition-colors hover:text-secondary"
										aria-label="Email de {player.name}"
									>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											width="20"
											height="20"
											viewBox="0 0 24 24"
										>
											<path
												fill="currentColor"
												d="M4.616 19q-.691 0-1.153-.462T3 17.384V6.616q0-.691.463-1.153T4.615 5h14.77q.69 0 1.152.463T21 6.616v10.769q0 .69-.463 1.153T19.385 19zM12 12.116L4 6.885v10.5q0 .269.173.442t.443.173h14.769q.269 0 .442-.173t.173-.443v-10.5zM12 11l7.692-5H4.308zM4 6.885V6v11.385q0 .269.173.442t.443.173H4z"
											/>
										</svg>
									</a>
								{/if}
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
