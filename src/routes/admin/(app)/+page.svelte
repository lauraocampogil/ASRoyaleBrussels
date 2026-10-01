<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<div class="mx-auto max-w-6xl">
	<h1 class="font-clash mb-6 text-2xl text-dark">Inscriptions ({data.players.length})</h1>

	<div class="overflow-x-auto rounded-lg border border-dark-accent/10">
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
