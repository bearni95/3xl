import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, type Plugin } from 'vite';
import { cpSync, createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { IncomingMessage, ServerResponse } from 'node:http';

// The @3xl/assets and @3xl/data workspace packages sit next to the frontend.
// Their `public/` dirs are served at /assets and /data respectively.
const WORKSPACE_PUBLIC = [
	{ prefix: '/assets', dir: fileURLToPath(new URL('../assets/public', import.meta.url)) },
	{ prefix: '/data', dir: fileURLToPath(new URL('../data/public', import.meta.url)) }
];
const DIST_DIR = fileURLToPath(new URL('./dist', import.meta.url));

const MIME: Record<string, string> = {
	'.png': 'image/png',
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.gif': 'image/gif',
	'.webp': 'image/webp',
	'.svg': 'image/svg+xml',
	'.json': 'application/json'
};

/** Connect middleware that serves files under `root` at URL `prefix`. */
function serveDir(prefix: string, root: string) {
	return (req: IncomingMessage, res: ServerResponse, next: () => void) => {
		const url = (req.url ?? '').split('?')[0];
		if (url !== prefix && !url.startsWith(prefix + '/')) return next();
		const rel = decodeURIComponent(url.slice(prefix.length));
		const filePath = normalize(join(root, rel));
		// Guard against path traversal outside the served root.
		if (filePath !== root && !filePath.startsWith(root + sep)) return next();
		if (!existsSync(filePath) || !statSync(filePath).isFile()) return next();
		res.setHeader(
			'Content-Type',
			MIME[extname(filePath).toLowerCase()] ?? 'application/octet-stream'
		);
		createReadStream(filePath).pipe(res);
	};
}

/**
 * Serves the @3xl/assets and @3xl/data packages the frontend installs:
 *  - dev/preview: connect middleware mounts each package's public/ dir;
 *  - build: after adapter-static writes dist/, copy the dirs into dist so the
 *    static bundle is self-contained, and mirror index.html to 404.html for
 *    GitHub Pages SPA deep-link routing. Placed AFTER sveltekit() so this
 *    closeBundle runs once the adapter has finished emitting dist/.
 */
function serveWorkspacePublic(): Plugin {
	return {
		name: 'serve-workspace-public',
		configureServer(server) {
			for (const { prefix, dir } of WORKSPACE_PUBLIC)
				server.middlewares.use(serveDir(prefix, dir));
		},
		configurePreviewServer(server) {
			for (const { prefix, dir } of WORKSPACE_PUBLIC)
				server.middlewares.use(serveDir(prefix, dir));
		},
		closeBundle() {
			if (!existsSync(DIST_DIR)) return;
			for (const { prefix, dir } of WORKSPACE_PUBLIC) {
				if (existsSync(dir)) cpSync(dir, join(DIST_DIR, prefix.slice(1)), { recursive: true });
			}
			// GitHub Pages serves 404.html for any unknown path. Mirror the
			// adapter's index.html shell to 404.html so deep links (e.g. the
			// /profile magic-link redirect) boot the SPA instead of hitting
			// GitHub's own 404; the client router then resolves the real route.
			const indexHtml = join(DIST_DIR, 'index.html');
			if (existsSync(indexHtml)) cpSync(indexHtml, join(DIST_DIR, '404.html'));
		}
	};
}

export default defineConfig({
	plugins: [tailwindcss(), sveltekit(), serveWorkspacePublic()],
	// @3xl/data ships TypeScript source (no build step); let Vite transpile it.
	optimizeDeps: { exclude: ['@3xl/data'] }
});
