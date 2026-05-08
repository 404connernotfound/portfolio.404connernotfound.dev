import adapter from '@sveltejs/adapter-node';
import preprocess from 'svelte-preprocess';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: preprocess({
		scss: {
			includePaths: ['src']
		}
	}),
	kit: {
		adapter: adapter({
			out: 'build',
			precompress: true
		})
	}
};

export default config;
