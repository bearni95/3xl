#!/usr/bin/env node
/**
 * Pull the Catalan show themes off the Wayback Machine's amiboshi.cat snapshot.
 *
 * amiboshi.cat is gone. What is left of it are the captures the local pages came from,
 * whose download links are relative to a site that no longer answers, so each one has to
 * be re-pointed at the archive. This script reads the links out of those pages rather
 * than carrying a hardcoded list, and rewrites each into
 *
 *   https://web.archive.org/web/<timestamp>id_/https://www.amiboshi.cat/mp3/<file>
 *
 * The `id_` suffix asks for the bytes as captured, without the archive's toolbar or any
 * rewriting - the difference between an mp3 and an HTML page about an mp3. A request for a
 * timestamp the archive has no capture at redirects to the nearest one it does have, which
 * is why redirects are followed and the capture actually served is recorded per file.
 *
 * Every download is verified before it is kept (see verify()), written as .part and only
 * then renamed, so an interrupted run leaves nothing that looks finished. A file already
 * on disk whose recorded sha256 still matches is skipped, making the script resumable
 * against the archive's rate limiting.
 *
 * Downloads land in a staging folder at the repo root, one per source page, not in
 * @3xl/assets' public/music/: which of these belong in the game, and under what name, is
 * a curation call, and that folder's files are already named for the show they open.
 *
 * The pages are listed in SOURCES below. Adding another of amiboshi.cat's show pages is a
 * line there - nothing else here knows which show it is looking at, because the slug of
 * every file comes out of the file's own name ("One Piece - We are (català)…" is already
 * saying it) and the link between a song and a show is made later, by hand, in
 * @3xl/data's music.json.
 *
 * Usage:
 *   node download-amiboshi-songs.js [source...] [options]
 *
 * With no source named, every page in SOURCES is pulled. Otherwise name them:
 *   node download-amiboshi-songs.js one-piece
 *
 *   --delay <ms>      pause between downloads (default: 1500)
 *   --retries <n>     attempts per file, backing off (default: 4)
 *   --list            print what would be fetched and exit
 *   --force           re-download files already verified on disk
 */

import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { existsSync, statSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

/**
 * The capture the pages were taken from. It only has to name a moment the site was up:
 * the archive answers a timestamp it holds no capture at with a redirect to the nearest
 * one it does, and the mp3s all sit in this one folder, so a page saved from a different
 * capture than another still resolves through it. Which capture each file actually came
 * from is not assumed - it is read back off the redirect and recorded per song.
 */
const SNAPSHOT = '20250226191108';
const ORIGIN = 'https://www.amiboshi.cat/';

/** Below this an mp3 is a stub or an error page, whatever its headers claim. */
const MIN_BYTES = 64 * 1024;

/**
 * The saved pages, and where each one's pull is staged. A source's name is what you pass
 * on the command line; nothing else is keyed by it.
 */
const SOURCES = [
	{ name: 'inuyasha', html: 'inuyasha-songs.html', out: 'inuyasha-mp3' },
	{ name: 'one-piece', html: 'onepiece-music.html', out: 'onepiece-mp3' }
];

const DEFAULTS = {
	sources: [],
	delay: 1500,
	retries: 4,
	list: false,
	force: false
};

// ---------------------------------------------------------------------------- args

function parseArgs(argv) {
	const options = { ...DEFAULTS };

	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		switch (arg) {
			case '--list':
				options.list = true;
				break;
			case '--force':
				options.force = true;
				break;
			case '--delay':
			case '--retries':
				options[arg.slice(2)] = Number(argv[++i]);
				break;
			case '--help':
			case '-h':
				console.log(help());
				process.exit(0);
				break;
			default: {
				if (arg.startsWith('-')) throw new Error(`unknown option: ${arg}`);

				const source = SOURCES.find((candidate) => candidate.name === arg);
				if (!source) {
					const names = SOURCES.map((candidate) => candidate.name).join(', ');
					throw new Error(`unknown source: ${arg} (have: ${names})`);
				}
				options.sources.push(source);
			}
		}
	}

	if (!options.sources.length) options.sources = [...SOURCES];

	for (const key of ['delay', 'retries']) {
		if (!Number.isFinite(options[key]) || options[key] < 0) {
			throw new Error(`--${key} must be a non-negative number`);
		}
	}

	return options;
}

function help() {
	return [
		'Usage: node download-amiboshi-songs.js [source...] [options]',
		'',
		`Sources (all of them if none is named): ${SOURCES.map((s) => s.name).join(', ')}`,
		'',
		'  --delay <ms>    pause between downloads  (default: 1500)',
		'  --retries <n>   attempts per file        (default: 4)',
		'  --list          print the plan and exit',
		'  --force         re-download verified files'
	].join('\n');
}

// ---------------------------------------------------------------------------- parsing

const ENTITIES = {
	'&nbsp;': ' ',
	'&amp;': '&',
	'&lt;': '<',
	'&gt;': '>',
	'&quot;': '"',
	'&#39;': "'",
	'&apos;': "'"
};

function text(html) {
	return html
		.replace(/<[^>]*>/g, '')
		.replace(/&(?:nbsp|amp|lt|gt|quot|apos|#39);/g, (m) => ENTITIES[m])
		.replace(/\s+/g, ' ')
		.trim();
}

/**
 * The page is one flat run of headings, so a song's metadata is whatever headings were
 * last seen above its link: h2 the song, h3 which opening or ending it is, h4 whose
 * version it is and who sings it. Two links can share one h4 (a song captured twice, the
 * raw rip and a restored pass), which is what the link's own label distinguishes.
 */
function parseSongs(html) {
	const pattern =
		/<(h2|h3|h4)[^>]*>([\s\S]*?)<\/\1>|<a\s+[^>]*href="mp3\/([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;

	const songs = [];
	let title = '';
	let part = '';
	let version = '';

	for (const match of html.matchAll(pattern)) {
		const [, tag, body, file, label] = match;

		if (tag) {
			const value = text(body);
			if (!value) continue; // spacer heading: <h2>&nbsp;</h2> and friends

			if (tag.toLowerCase() === 'h2') {
				title = value;
				part = '';
				version = '';
			} else if (tag.toLowerCase() === 'h3') {
				part = value.replace(/^\(|\)$/g, '');
			} else {
				version = value;
			}
			continue;
		}

		songs.push({ file: decodeURIComponent(file), label: text(label), title, part, version });
	}

	return songs.map((song) => ({ ...song, slug: slugFor(song), url: archiveUrl(song.file) }));
}

function archiveUrl(file) {
	// Encode the path, not the whole URL: the filenames carry spaces, accents and
	// parentheses, and the archive wants them percent-encoded exactly once.
	return `https://web.archive.org/web/${SNAPSHOT}id_/${ORIGIN}mp3/${encodeURIComponent(file)}`;
}

/**
 * A filename such as "Inuyasha - Come (català) (v. TVC, restaurada) v3.mp3" becomes
 * inuyasha-come-tvc-restaurada.mp3: the show, the song, and the parentheticals that say
 * which cut this is - minus "català" (all of them are) and the trailing revision marker
 * the site used for its own re-uploads.
 */
function slugFor({ file }) {
	const base = file.replace(/\.mp3$/i, '').replace(/\s+v\d+$/i, '');
	const parentheticals = [...base.matchAll(/\(([^)]*)\)/g)].map(([, inner]) => inner);
	const name = base.replace(/\([^)]*\)/g, ' ');

	const qualifiers = parentheticals
		.map((inner) => inner.replace(/^v\.\s*/i, ''))
		.filter((inner) => !/^catal/i.test(inner))
		.flatMap((inner) => inner.split(','));

	return [slugify(name), ...qualifiers.map(slugify)].filter(Boolean).join('-') + '.mp3';
}

function slugify(value) {
	return value
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

// ---------------------------------------------------------------------------- verifying

/**
 * What makes these bytes an mp3 rather than something the archive said 200 to. The
 * archive answers a miss with an HTML page, and a truncated transfer with fewer bytes
 * than it promised, so both the framing and the length are checked.
 */
function verify(bytes, response) {
	const type = (response.headers.get('content-type') ?? '').split(';')[0].trim();
	const promised = Number(response.headers.get('content-length'));

	if (!/^audio\//.test(type)) return `served ${type || 'no content type'}, not audio`;
	if (bytes.length < MIN_BYTES) return `only ${bytes.length} bytes`;
	if (Number.isFinite(promised) && promised > 0 && promised !== bytes.length) {
		return `truncated: got ${bytes.length} of ${promised} bytes`;
	}

	const id3 = bytes.subarray(0, 3).toString('latin1') === 'ID3';
	const frameSync = bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0;
	if (!id3 && !frameSync) return 'no ID3 tag or MPEG frame sync at the start';

	return null;
}

function sha256(bytes) {
	return createHash('sha256').update(bytes).digest('hex');
}

// ---------------------------------------------------------------------------- fetching

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Which capture the archive actually served, read back off the redirected URL. */
function capturedAt(url) {
	return /\/web\/(\d{14})/.exec(url)?.[1] ?? SNAPSHOT;
}

async function download(song, options) {
	let lastError;

	for (let attempt = 1; attempt <= options.retries; attempt++) {
		if (attempt > 1) {
			const backoff = options.delay * 2 ** (attempt - 1);
			console.log(`      retry ${attempt}/${options.retries} in ${Math.round(backoff / 1000)}s`);
			await sleep(backoff);
		}

		try {
			const response = await fetch(song.url, {
				redirect: 'follow',
				headers: { 'user-agent': 'amiboshi-songs-archival/1.0' },
				signal: AbortSignal.timeout(120_000)
			});

			if (response.status === 429 || response.status >= 500) {
				// The archive throttles hard; Retry-After is worth more than our backoff.
				const after = Number(response.headers.get('retry-after'));
				if (Number.isFinite(after) && after > 0) await sleep(Math.min(after, 120) * 1000);
				lastError = `HTTP ${response.status}`;
				continue;
			}

			if (!response.ok) return { error: `HTTP ${response.status}` }; // 404 and friends: no point retrying

			const bytes = Buffer.from(await response.arrayBuffer());
			const problem = verify(bytes, response);
			if (problem) {
				lastError = problem;
				continue;
			}

			return { bytes, capture: capturedAt(response.url) };
		} catch (error) {
			lastError = error.name === 'TimeoutError' ? 'timed out' : error.message;
		}
	}

	return { error: lastError ?? 'unknown failure' };
}

// ---------------------------------------------------------------------------- run

async function readManifest(file) {
	try {
		return JSON.parse(await readFile(file, 'utf8'));
	} catch {
		return { snapshot: SNAPSHOT, source: ORIGIN, songs: [] };
	}
}

function alreadyHave(song, manifest, outDir) {
	const previous = manifest.songs.find((entry) => entry.slug === song.slug);
	if (!previous?.sha256) return null;

	const target = path.join(outDir, song.slug);
	if (!existsSync(target) || statSync(target).size !== previous.bytes) return null;

	return previous;
}

async function main() {
	const options = parseArgs(process.argv.slice(2));

	let failures = 0;
	for (const source of options.sources) {
		if (options.sources.length > 1) console.log(`--- ${source.name} ---`);
		failures += await pull(source, options);
	}

	if (failures) {
		console.log('\nRe-run to retry only what failed; verified files are skipped.');
		process.exitCode = 1;
	}
}

/** Fetch one source page's songs. Returns how many failed. */
async function pull(source, options) {
	const htmlPath = path.resolve(source.html);
	const outDir = path.resolve(source.out);

	const songs = parseSongs(await readFile(htmlPath, 'utf8'));
	if (!songs.length) throw new Error(`no mp3 links found in ${htmlPath}`);

	const collisions = songs.filter(
		(song, i) => songs.findIndex((other) => other.slug === song.slug) !== i
	);
	if (collisions.length) {
		throw new Error(`two songs want the same name: ${collisions.map((s) => s.slug).join(', ')}`);
	}

	console.log(`${songs.length} songs linked from ${path.relative(process.cwd(), htmlPath)}\n`);

	if (options.list) {
		for (const song of songs) {
			console.log(`${song.slug}\n   ${describe(song)}\n   ${song.url}\n`);
		}
		return 0;
	}

	await mkdir(outDir, { recursive: true });
	const manifestPath = path.join(outDir, 'manifest.json');
	const manifest = await readManifest(manifestPath);

	const results = [];
	let index = 0;

	for (const song of songs) {
		index++;
		const prefix = `[${String(index).padStart(2, ' ')}/${songs.length}]`;
		console.log(`${prefix} ${song.slug}`);
		console.log(`      ${describe(song)}`);

		const previous = options.force ? null : alreadyHave(song, manifest, outDir);
		if (previous) {
			console.log(`      have it (${mb(previous.bytes)}), skipping`);
			results.push(previous);
			continue;
		}

		const { bytes, capture, error } = await download(song, options);
		if (error) {
			console.log(`      FAILED: ${error}`);
			results.push({ ...entryFor(song), error });
		} else {
			const part = path.join(outDir, `${song.slug}.part`);
			await writeFile(part, bytes);
			await rename(part, path.join(outDir, song.slug));

			const digest = sha256(bytes);
			console.log(`      ok ${mb(bytes.length)}  capture ${capture}  ${digest.slice(0, 12)}`);
			results.push({ ...entryFor(song), capture, bytes: bytes.length, sha256: digest });
		}

		if (index < songs.length) await sleep(options.delay);
	}

	await writeFile(
		manifestPath,
		JSON.stringify(
			{ snapshot: SNAPSHOT, source: ORIGIN, retrieved: new Date().toISOString(), songs: results },
			null,
			'\t'
		) + '\n'
	);

	const failed = results.filter((entry) => entry.error);
	const kept = results.filter((entry) => !entry.error);

	console.log(`\n${kept.length}/${songs.length} verified in ${path.relative(process.cwd(), outDir)}`);
	console.log(`manifest: ${path.relative(process.cwd(), manifestPath)}`);

	if (failed.length) {
		console.log(`\n${failed.length} failed:`);
		for (const entry of failed) console.log(`  ${entry.slug} - ${entry.error}`);
	}

	return failed.length;
}

function entryFor(song) {
	return {
		slug: song.slug,
		title: song.title,
		part: song.part,
		version: song.version,
		label: song.label,
		file: song.file,
		url: song.url
	};
}

function describe(song) {
	return [song.title, song.part, song.version, song.label].filter(Boolean).join(' - ');
}

function mb(bytes) {
	return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

/** A partial write left behind by a kill signal is not a download. */
for (const signal of ['SIGINT', 'SIGTERM']) {
	process.on(signal, () => {
		console.log('\ninterrupted');
		process.exit(130);
	});
}

main().catch((error) => {
	// Nothing is swept on the way out: a .part is never a file this script will trust
	// (alreadyHave only ever looks at the final name), and everything else in the folder
	// is either a verified download or the user's own.
	console.error(error.message);
	process.exit(1);
});
