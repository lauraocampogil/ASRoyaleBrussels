<script lang="ts">
	import { afterNavigate } from '$app/navigation';
	import { page } from '$app/state';
	import '../app.css';

	let { children } = $props();

	afterNavigate(() => {
		if (page.url.pathname === '/' && window.location.hash) {
			const id = window.location.hash.slice(1);
			setTimeout(() => {
				const target = document.getElementById(id);
				if (!target) return;
				const header = document.querySelector('header');
				const offset = (header?.clientHeight ?? 80) + 16;
				const top = target.getBoundingClientRect().top + window.scrollY - offset;
				window.scrollTo({ top, behavior: 'smooth' });
			}, 600);
		}
	});
</script>

{@render children()}
