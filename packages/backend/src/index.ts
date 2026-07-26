import { config as loadEnv } from 'dotenv';
import { fileURLToPath } from 'node:url';
import express, { type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';
import { charactersRouter } from './routes/characters';
import { characterTemplatesRouter } from './routes/character-templates';
import { showsRouter } from './routes/shows';
import { showTemplatesRouter } from './routes/show-templates';
import { tmdbRouter } from './routes/tmdb';
import type { HttpError } from './http-error';

// Load the repo-root .env (TMDB_API_KEY). Resolved from this file's location
// (packages/backend/src → repo root) so cwd doesn't matter.
loadEnv({ path: fileURLToPath(new URL('../../../.env', import.meta.url)) });

// This server is pinned to 2002 and the admin SPA to 2001 — hardcoded, not
// configurable, so the three dev servers always agree on their ports.
const PORT = 2002;
const ADMIN_ORIGIN = 'http://localhost:2001';
// The player app also reads the TMDB image proxy — its pack-opener canvas loads
// show posters through Pixi's fetch-based loader, which (unlike a plain <img>) is
// CORS-gated, so the frontend origin must be allowed too.
const FRONTEND_ORIGIN = 'http://localhost:2000';

const app = express();

// The admin SPA and player app are served cross-origin (2001/2000 → 2002); allow
// only those two.
app.use(
	cors({
		origin: [ADMIN_ORIGIN, FRONTEND_ORIGIN],
		methods: ['GET', 'POST', 'PUT'],
		allowedHeaders: ['content-type']
	})
);
// Saving a show POSTs its full image set (a show like One Piece has thousands of
// images), which far exceeds body-parser's 100kb default. This is a local
// authoring-only server, so allow a generous limit.
app.use(express.json({ limit: '50mb' }));

app.use('/api/characters', charactersRouter);
app.use('/api/character-templates', characterTemplatesRouter);
app.use('/api/shows', showsRouter);
app.use('/api/show-templates', showTemplatesRouter);
app.use('/api/tmdb', tmdbRouter);

// Central error handler: renders thrown HttpErrors as `{ message }` so the
// admin app's existing error handling keeps working.
app.use((err: HttpError, _req: Request, res: Response, _next: NextFunction) => {
	const status = err?.status ?? 500;
	if (status >= 500) console.error(err);
	res.status(status).json({ message: err?.message ?? 'Internal server error' });
});

const server = app.listen(PORT, () => {
	console.log(`@3xl/backend listening on http://localhost:${PORT}`);
});

// Refuse to run anywhere but 2002: if the port is taken, exit instead of
// falling back to another port.
server.on('error', (err: NodeJS.ErrnoException) => {
	if (err.code === 'EADDRINUSE') {
		console.error(`Port ${PORT} is already in use — @3xl/backend must run on ${PORT}. Exiting.`);
	} else {
		console.error(err);
	}
	process.exit(1);
});
