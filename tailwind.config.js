/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	theme: {
		extend: {
			fontFamily: {
				sans: [
					'-apple-system',
					'BlinkMacSystemFont',
					'"Segoe UI"',
					'Helvetica',
					'Arial',
					'sans-serif',
				],
				mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
			},
			colors: {
				ink: {
					50: '#fafafa',
					100: '#f4f4f5',
					200: '#d4d4d8',
					300: '#a1a1aa',
					400: '#71717a',
					500: '#52525b',
					600: '#3f3f46',
					700: '#27272a',
					800: '#18181b',
					900: '#09090b',
				},
				signal: {
					100: '#ede9fe',
					300: '#c4b5fd',
					500: '#8b5cf6',
					700: '#6d28d9',
				},
				aurora: {
					200: '#c4b5fd',
					400: '#8b5cf6',
					600: '#6d28d9',
				},
				night: {
					500: '#121217',
					700: '#09090b',
					900: '#050505',
				},
			},
			boxShadow: {
				soft: '0 24px 70px -42px rgba(0, 0, 0, 0.9)',
				glow: '0 0 40px rgba(124, 58, 237, 0.18)',
			},
		},
	},
	plugins: [],
};
