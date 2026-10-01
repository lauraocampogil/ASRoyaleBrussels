<script lang="ts">
	let { data, children } = $props();
</script>

<div class="min-h-screen bg-background">
	<header
		class="flex flex-col gap-3 border-b border-dark-accent/10 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"
	>
		<span class="font-clash text-base text-dark sm:text-lg">Brussels Summit Academy — Staff</span>
		<div class="flex items-center justify-between gap-4 sm:justify-end">
			<span class="truncate text-sm text-dark-accent">{data.staffEmail}</span>
			<form method="POST" action="?/logout">
				<button type="submit" class="shrink-0 text-sm text-dark underline">Se déconnecter</button>
			</form>
		</div>
	</header>

	<main class="px-4 py-6 sm:px-6 sm:py-8">
		{@render children()}
	</main>
</div>
