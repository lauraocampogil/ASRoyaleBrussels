import type { Action } from 'svelte/action';

interface RevealOptions {
	y?: number;
	stagger?: number;
	start?: string;
	end?: string;
	scrub?: boolean | number;
}

let refreshTimeout: ReturnType<typeof setTimeout> | null = null;

function debouncedRefresh(ScrollTrigger: any) {
	if (refreshTimeout) clearTimeout(refreshTimeout);
	refreshTimeout = setTimeout(() => {
		ScrollTrigger.refresh();
	}, 300);
}

export const reveal: Action<HTMLElement, RevealOptions | undefined> = (node, options = {}) => {
	let ctx: any;

	(async () => {
		const { default: gsap } = await import('gsap');
		const { ScrollTrigger } = await import('gsap/ScrollTrigger');
		gsap.registerPlugin(ScrollTrigger);

		const { y = 60, stagger, start = 'top 90%', end = 'top 45%', scrub = true } = options;

		ctx = gsap.context(() => {
			if (stagger) {
				const targets = Array.from(node.children) as HTMLElement[];
				gsap.set(targets, { opacity: 0, y });

				ScrollTrigger.batch(targets, {
					start,
					onEnter: (batch: Element[]) => {
						gsap.to(batch, {
							opacity: 1,
							y: 0,
							duration: 0.8,
							stagger,
							ease: 'power3.out'
						});
					},
					onLeaveBack: (batch: Element[]) => {
						gsap.to(batch, {
							opacity: 0,
							y,
							duration: 0.4,
							stagger,
							ease: 'power3.in'
						});
					}
				});
			} else {
				gsap.set(node, { opacity: 0, y });

				gsap.to(node, {
					opacity: 1,
					y: 0,
					ease: 'none',
					scrollTrigger: {
						trigger: node,
						start,
						end,
						scrub: typeof scrub === 'number' ? scrub : 1,
						invalidateOnRefresh: true
					}
				});
			}

			const imgs = node.querySelectorAll('img');
			imgs.forEach((img) => {
				if (!(img as HTMLImageElement).complete) {
					img.addEventListener('load', () => debouncedRefresh(ScrollTrigger), { once: true });
				}
			});
		}, node);

		if (document.readyState === 'complete') {
			debouncedRefresh(ScrollTrigger);
		} else {
			window.addEventListener('load', () => debouncedRefresh(ScrollTrigger), { once: true });
		}
	})();

	return {
		destroy() {
			ctx?.revert();
		}
	};
};
