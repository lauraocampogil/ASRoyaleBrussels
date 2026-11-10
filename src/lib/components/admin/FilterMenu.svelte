<script lang="ts">
	type Item = {
		label: string;
		value: string;
		def: string;
		options: (string | number)[][];
		set: (v: string) => void;
	};

	let { items = [] }: { items: Item[] } = $props();
	let open = $state(false);
	let active = $derived(items.filter((i) => i.value !== i.def).length);
</script>

<div class="relative print:hidden">
	<button
		type="button"
		onclick={() => (open = !open)}
		class="flex items-center gap-2 rounded-xl border border-dark-accent/10 bg-white px-4 py-2 text-sm text-dark shadow-sm transition-colors hover:bg-[#f4f5f7]"
		aria-expanded={open}
	>
		<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
			<path d="M22 3H2l8 9.46V19l4 2v-8.54z" />
		</svg>
		Filtres
		{#if active > 0}
			<span class="flex h-5 min-w-5 items-center justify-center rounded-full bg-dark px-1.5 text-[11px] font-medium text-white">{active}</span>
		{/if}
	</button>

	{#if open}
		<button type="button" class="fixed inset-0 z-20 cursor-default" aria-label="Fermer les filtres" onclick={() => (open = false)}></button>
		<div class="absolute left-0 z-30 mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-2xl bg-white p-4 shadow-lg ring-1 ring-dark-accent/10">
			{#each items as it}
				<label class="mb-3 block text-xs font-medium text-dark-accent">
					{it.label}
					<select
						value={it.value}
						onchange={(e) => it.set(e.currentTarget.value)}
						class="mt-1 w-full rounded-xl border border-dark-accent/10 bg-[#f4f5f7] px-3 py-2 text-sm text-dark"
					>
						{#each it.options as o}
							<option value={o[0]}>{o[1]}{o[2] !== undefined ? ` (${o[2]})` : ''}</option>
						{/each}
					</select>
				</label>
			{/each}
			<div class="flex gap-2">
				<button type="button" onclick={() => items.forEach((i) => i.set(i.def))} class="flex-1 rounded-xl bg-[#f4f5f7] py-2 text-sm text-dark-accent hover:bg-[#eceef1]">Réinitialiser</button>
				<button type="button" onclick={() => (open = false)} class="flex-1 rounded-xl bg-dark py-2 text-sm font-medium text-white">OK</button>
			</div>
		</div>
	{/if}
</div>
