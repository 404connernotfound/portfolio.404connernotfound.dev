import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	server: {
		host: true,
		port: Number(process.env.PORT) || 5173,
		allowedHosts: [
			'404connernotfound.dev'
		]
	},
	preview: {
		host: true,
		port: Number(process.env.PORT) || 4173
	}
});
