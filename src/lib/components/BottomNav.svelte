<script lang="ts">
	import { page } from '$app/state';
	import { base } from '$app/paths';

	const tabs = [
		{ href: '/', label: 'Start', icon: 'home' },
		{ href: '/history', label: 'Verlauf', icon: 'history' },
		{ href: '/templates', label: 'Vorlagen', icon: 'templates' },
		{ href: '/exercises', label: 'Übungen', icon: 'exercises' },
		{ href: '/settings', label: 'Einstellungen', icon: 'settings' }
	] as const;

	function isActive(href: string): boolean {
		const fullPath = `${base}${href}`;
		if (href === '/') return page.url.pathname === fullPath || page.url.pathname === `${base}`;
		return page.url.pathname.startsWith(fullPath);
	}
</script>

<nav
	class="fixed bottom-0 left-0 right-0 z-50 flex border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)] dark:border-gray-800 dark:bg-gray-950"
>
	{#each tabs as tab}
		<a
			href="{base}{tab.href}"
			class="flex flex-1 flex-col items-center gap-0.5 py-2 text-xs transition-colors {isActive(tab.href)
				? 'text-blue-500'
				: 'text-gray-500 dark:text-gray-400'}"
		>
			{#if tab.icon === 'home'}
				<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
					<path stroke-linecap="round" stroke-linejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1" />
				</svg>
			{:else if tab.icon === 'history'}
				<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
					<path stroke-linecap="round" stroke-linejoin="round" d="M3 13h4l3-8 4 16 3-8h4" />
				</svg>
			{:else if tab.icon === 'templates'}
				<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
					<path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
				</svg>
			{:else if tab.icon === 'exercises'}
				<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
					<path stroke-linecap="round" stroke-linejoin="round" d="M6.5 6.5v11M17.5 6.5v11M6.5 12h11M4 8v8M20 8v8M2 10v4M22 10v4" />
				</svg>
			{:else if tab.icon === 'settings'}
				<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
					<path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
					<path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
				</svg>
			{/if}
			<span>{tab.label}</span>
		</a>
	{/each}
</nav>
