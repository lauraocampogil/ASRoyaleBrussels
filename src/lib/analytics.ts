const GA4_ID = 'G-RGQCYL7WJK';
const CONSENT_KEY = 'bsa_cookie_consent';

export type ConsentChoice = 'accepted' | 'declined';

export function getStoredConsent(): ConsentChoice | null {
	if (typeof localStorage === 'undefined') return null;
	const value = localStorage.getItem(CONSENT_KEY);
	return value === 'accepted' || value === 'declined' ? value : null;
}

export function storeConsent(choice: ConsentChoice) {
	localStorage.setItem(CONSENT_KEY, choice);
}

export function loadGoogleAnalytics() {
	if (typeof document === 'undefined') return;
	if (document.getElementById('ga4-script')) return; // déjà chargé

	const script = document.createElement('script');
	script.id = 'ga4-script';
	script.async = true;
	script.src = `https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`;
	document.head.appendChild(script);

	window.dataLayer = window.dataLayer || [];
	function gtag(...args: unknown[]) {
		window.dataLayer.push(args);
	}

	window.gtag = gtag;
	gtag('js', new Date());
	gtag('config', GA4_ID);
}

declare global {
	interface Window {
		dataLayer: unknown[];
		gtag?: (...args: unknown[]) => void;
	}
}
