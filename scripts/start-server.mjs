import { server } from '../build/index.js';

// Adapter static-file handling runs before SvelteKit hooks. Apply this header at
// the HTTP boundary so bundled PDFs and raster uploads receive it as well.
server.server.prependListener('request', (_request, response) => {
	response.setHeader('X-Content-Type-Options', 'nosniff');
});
