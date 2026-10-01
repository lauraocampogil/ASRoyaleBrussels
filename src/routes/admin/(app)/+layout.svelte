<script lang="ts">
	let { data, children } = $props();
</script>

<div class="min-h-screen bg-background">
	<header class="flex items-center justify-between border-b border-dark-accent/10 px-6 py-4">
		<span class="font-clash text-lg text-dark">Brussels Summit Academy — Staff</span>
		<div class="flex items-center gap-4">
			<span class="text-sm text-dark-accent">{data.staffEmail}</span>
			<form method="POST" action="?/logout">
				<button type="submit" class="text-sm text-dark underline">Se déconnecter</button>
			</form>
		</div>
	</header>

	<main class="px-6 py-8">
		{@render children()}
	</main>
</div>
