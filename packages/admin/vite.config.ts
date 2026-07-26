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
		const stat = statSync(filePath);
		// Cache validators so the browser always revalidates before reusing a file:
		// regenerated data (geo layers, manifests) is picked up on the next request
		// instead of being served stale from the browser cache. `no-cache` means
		// "you may cache, but revalidate every time" — an unchanged file then 304s
		// cheaply, a changed one 200s fresh.
		const etag = `"${stat.size.toString(16)}-${stat.mtimeMs.toString(16)}"`;
		res.setHeader('Cache-Control', 'no-cache');
		res.setHeader('ETag', etag);
		res.setHeader('Last-Modified', stat.mtime.toUTCString());
		if (req.headers['if-none-match'] === etag) {
			res.statusCode = 304;
			res.end();
			return;
		}
		res.setHeader(
			'Content-Type',
			MIME[extname(filePath).toLowerCase()] ?? 'application/octet-stream'
		);
		res.setHeader('Content-Length', stat.size);
		createReadStream(filePath).pipe(res);
	};
}

/**
 * Serves the @3xl/assets and @3xl/data packages the frontend installs:
 *  - dev/preview: connect middleware mounts each package's public/ dir;
 *  - build: after adapter-static writes dist/, copy the dirs into dist so the
 *    static bundle is self-contained. Placed AFTER sveltekit() so this
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
		}
	};
}

export default defineConfig({
	plugins: [tailwindcss(), sveltekit(), serveWorkspacePublic()],
	// @3xl/data ships TypeScript source (no build step); let Vite transpile it.
	optimizeDeps: { exclude: ['@3xl/data'] }
});
