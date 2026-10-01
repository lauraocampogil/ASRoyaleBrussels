import { writable } from 'svelte/store';

export const scrollNormalizer = writable<{ disable: () => void; enable: () => void } | null>(null);
