declare module 'virtual:pwa-info' {
	export const pwaInfo:
		| {
				webManifest?: {
					linkTag: string;
				};
		  }
		| undefined;
}

declare module 'virtual:pwa-register' {
	export function registerSW(options?: {
		onNeedRefresh?: () => void;
		onOfflineReady?: () => void;
	}): (reloadPage?: boolean) => Promise<void>;
}
