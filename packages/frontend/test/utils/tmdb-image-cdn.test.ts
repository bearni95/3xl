import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmdbCdnImageUrl, showEntryOnCdn } from '$utils/tmdb/image-cdn';
import type { ShowEntry, ShowsCollection } from '$types/show.type';
import type { DisplayTMDBImage } from '$types/tmdb.type';

// The collection the admin /shows screen writes and the app serves at /data/shows.json.
const SHOWS_JSON = join(__dirname, '../../../data/public/shows.json');

const PROXIED = 'http://localhost:2002/api/tmdb/image/w342/rLHhDpv6rrhuzBjNzaMRNv2fng.jpg';
const CDN = 'https://image.tmdb.org/t/p/w342/rLHhDpv6rrhuzBjNzaMRNv2fng.jpg';

function image(file: string, kind: DisplayTMDBImage['kind']): DisplayTMDBImage {
	return {
		thumbnailUrl: `http://localhost:2002/api/tmdb/image/w342/${file}`,
		fullUrl: `http://localhost:2002/api/tmdb/image/original/${file}`,
		width: 500,
		height: 750,
		aspectRatio: 0.667,
		filePath: `/${file}`,
		kind,
		language: null
	};
}

describe('tmdbCdnImageUrl', () => {
	it('rewrites a dev-proxy URL to the TMDB CDN, keeping size and file', () => {
		expect(tmdbCdnImageUrl(PROXIED)).toBe(CDN);
		expect(tmdbCdnImageUrl('http://localhost:2002/api/tmdb/image/original/abc-1.png')).toBe(
			'https://image.tmdb.org/t/p/original/abc-1.png'
		);
	});

	it('rewrites the proxy on any host, not just localhost', () => {
		expect(tmdbCdnImageUrl('https://authoring.example/api/tmdb/image/w780/a.jpg')).toBe(
			'https://image.tmdb.org/t/p/w780/a.jpg'
		);
	});

	it('leaves a CDN URL alone, so applying it twice changes nothing', () => {
		expect(tmdbCdnImageUrl(CDN)).toBe(CDN);
		expect(tmdbCdnImageUrl(tmdbCdnImageUrl(PROXIED))).toBe(CDN);
	});

	it('passes through anything that is not a proxied image', () => {
		expect(tmdbCdnImageUrl(null)).toBeNull();
		expect(tmdbCdnImageUrl(undefined)).toBeUndefined();
		expect(tmdbCdnImageUrl('')).toBe('');
		expect(tmdbCdnImageUrl('/assets/icons/shows/straw-hat.svg')).toBe(
			'/assets/icons/shows/straw-hat.svg'
		);
		// The search/details routes, not the image route.
		expect(tmdbCdnImageUrl('http://localhost:2002/api/tmdb/search?query=one')).toBe(
			'http://localhost:2002/api/tmdb/search?query=one'
		);
	});
});

describe('showEntryOnCdn', () => {
	const poster = image('poster.jpg', 'poster');
	const logo = image('logo.png', 'logo');
	const entry: ShowEntry = {
		show: {
			id: 37854,
			name: 'One Piece',
			originalName: 'ワンピース',
			firstAirYear: '1999',
			lastAirYear: null,
			overview: 'Gol D. Roger…',
			posterUrl: PROXIED,
			backdropUrl: null,
			voteAverage: 8.7,
			voteCount: 4800,
			genres: ['Animació'],
			numberOfSeasons: 22,
			numberOfEpisodes: 1100
		},
		images: { id: 37854, posters: [poster], backdrops: [], logos: [logo], all: [poster, logo] },
		enabledImages: { poster: ['/poster.jpg'] },
		icon: 'shows/straw-hat'
	};

	it('moves every URL the entry carries onto the CDN', () => {
		const migrated = showEntryOnCdn(entry);
		expect(migrated.show.posterUrl).toBe(CDN);
		expect(migrated.images.posters[0].thumbnailUrl).toBe(
			'https://image.tmdb.org/t/p/w342/poster.jpg'
		);
		expect(migrated.images.posters[0].fullUrl).toBe(
			'https://image.tmdb.org/t/p/original/poster.jpg'
		);
		expect(migrated.images.all.map((i) => i.thumbnailUrl)).toEqual([
			'https://image.tmdb.org/t/p/w342/poster.jpg',
			'https://image.tmdb.org/t/p/w342/logo.png'
		]);
		expect(
			JSON.stringify(migrated).includes('localhost:2002'),
			'no proxied URL survives into shipped data'
		).toBe(false);
	});

	it('leaves the authored parts of the entry — selection, glyph, text, votes — untouched', () => {
		const migrated = showEntryOnCdn(entry);
		expect(migrated.enabledImages).toEqual({ poster: ['/poster.jpg'] });
		expect(migrated.icon).toBe('shows/straw-hat');
		expect(migrated.show.name).toBe('One Piece');
		expect(migrated.show.voteAverage).toBe(8.7);
		expect(migrated.show.backdropUrl).toBeNull();
		expect(migrated.images.posters[0].filePath).toBe('/poster.jpg');
	});

	it('does not mutate the entry it is given', () => {
		showEntryOnCdn(entry);
		expect(entry.show.posterUrl).toBe(PROXIED);
		expect(entry.images.posters[0].thumbnailUrl).toContain('localhost:2002');
	});
});

// The reason the rewrite exists: shows.json ships into the player's static bundle,
// where the authoring backend does not exist. One proxied URL in here is a dead image
// on every machine but the author's, and nothing at run time would notice.
describe('the shipped shows.json', () => {
	const raw = readFileSync(SHOWS_JSON, 'utf-8');

	it('names no authoring server', () => {
		expect(raw).not.toContain('/api/tmdb/');
		expect(raw).not.toContain('localhost');
	});

	it('serves every image URL it holds from the TMDB CDN', () => {
		const { shows } = JSON.parse(raw) as ShowsCollection;
		expect(shows.length).toBeGreaterThan(0);
		const urls = shows.flatMap((show) => [
			show.show.posterUrl,
			show.show.backdropUrl,
			...show.images.all.flatMap((img) => [img.thumbnailUrl, img.fullUrl])
		]);
		const offenders = urls.filter((url) => url && !url.startsWith('https://image.tmdb.org/t/p/'));
		expect(offenders).toEqual([]);
	});
});
