<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<div class="mx-auto max-w-6xl">
	<h1 class="font-clash mb-6 text-xl text-dark sm:text-2xl">
		Inscriptions ({data.players.length})
	</h1>

	{#if data.loadError}
		<p class="mb-6 rounded bg-red-100 px-4 py-3 text-sm text-red-700">
			Impossible de charger les inscriptions depuis Directus. Vérifie que <code
				>DIRECTUS_SERVICE_TOKEN</code
			>
			est correct et que le rôle associé a bien les droits de lecture sur la collection Registration.
		</p>
	{:else if data.players.length === 0}
		<p class="rounded bg-dark-accent/5 px-4 py-3 text-sm text-dark-accent">
			Aucune inscription pour le moment.
		</p>
	{/if}

	<!-- Vue cartes : mobile -->
	<div class="flex flex-col gap-4 md:hidden">
		{#each data.players as player (player.id)}
			<div class="rounded-lg border border-dark-accent/10 p-4">
				<div class="mb-2 flex items-start justify-between gap-2">
					<div>
						<p class="font-medium text-dark">{player.first_name} {player.last_name}</p>
						<p class="text-xs text-dark-accent">{player.email}</p>
					</div>
					<span class="shrink-0 rounded bg-dark-accent/10 px-2 py-1 text-xs text-dark-accent">
						{player.type === 'talent_days' ? 'Talent Day' : 'Académie'}
					</span>
				</div>

				<div class="mb-3">
					{#if player.complete}
						<span class="rounded bg-green-100 px-2 py-1 text-xs text-green-700">Complet</span>
					{:else}
						<span class="rounded bg-red-100 px-2 py-1 text-xs text-red-700">
							Manque : {player.missing.join(', ')}
						</span>
					{/if}
				</div>

				<form method="POST" action="?/toggleAccepted" use:enhance>
					<input type="hidden" name="id" value={player.id} />
					<input type="hidden" name="accepted" value={(!player.accepted).toString()} />
					<button
						type="submit"
						class="w-full rounded px-3 py-2 text-sm transition-colors {player.accepted
							? 'bg-secondary text-dark'
							: 'bg-dark-accent/10 text-dark-accent'}"
					>
						{player.accepted ? '✓ Accepté' : 'En attente'}
					</button>
				</form>
			</div>
		{/each}
	</div>

	<!-- Vue tableau : desktop -->
	<div class="hidden overflow-x-auto rounded-lg border border-dark-accent/10 md:block">
		<table class="w-full text-left text-sm">
			<thead class="bg-dark-accent/5">
				<tr>
					<th class="px-4 py-3">Nom</th>
					<th class="px-4 py-3">Type</th>
					<th class="px-4 py-3">Email</th>
					<th class="px-4 py-3">Complétude</th>
					<th class="px-4 py-3">Accepté</th>
				</tr>
			</thead>
			<tbody>
				{#each data.players as player (player.id)}
					<tr class="border-t border-dark-accent/10">
						<td class="px-4 py-3 text-dark">{player.first_name} {player.last_name}</td>
						<td class="px-4 py-3 text-dark-accent">
							{player.type === 'talent_days' ? 'Talent Day' : 'Académie'}
						</td>
						<td class="px-4 py-3 text-dark-accent">{player.email}</td>
						<td class="px-4 py-3">
							{#if player.complete}
								<span class="rounded bg-green-100 px-2 py-1 text-xs text-green-700">Complet</span>
							{:else}
								<span
									class="rounded bg-red-100 px-2 py-1 text-xs text-red-700"
									title={player.missing.join(', ')}
								>
									Manque : {player.missing.join(', ')}
								</span>
							{/if}
						</td>
						<td class="px-4 py-3">
							<form method="POST" action="?/toggleAccepted" use:enhance>
								<input type="hidden" name="id" value={player.id} />
								<input type="hidden" name="accepted" value={(!player.accepted).toString()} />
								<button
									type="submit"
									class="rounded px-3 py-1.5 text-xs transition-colors {player.accepted
										? 'bg-secondary text-dark'
										: 'bg-dark-accent/10 text-dark-accent'}"
								>
									{player.accepted ? '✓ Accepté' : 'En attente'}
								</button>
							</form>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>
