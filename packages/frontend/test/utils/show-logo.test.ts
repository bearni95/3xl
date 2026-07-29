import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { showLogoUrl } from '$utils/show/show-logo';
import type { ShowEntry, ShowsCollection } from '$types/show.type';
import type { DisplayTMDBImage, TMDBImageKind } from '$types/tmdb.type';

// The collection the admin /shows screen writes and the app serves at /data/shows.json.
const SHOWS_JSON = join(__dirname, '../../../data/public/shows.json');

function image(filePath: string, kind: TMDBImageKind = 'logo'): DisplayTMDBImage {
	return {
		thumbnailUrl: `http://tmdb.test/w342${filePath}`,
		fullUrl: `http://tmdb.test/original${filePath}`,
		width: 1000,
		height: 300,
		aspectRatio: 3.33,
		filePath,
		kind,
		language: 'en'
	};
}

function entry(overrides: Partial<ShowEntry> = {}): ShowEntry {
	return {
		show: { id: 1, name: 'A Show' } as ShowEntry['show'],
		images: {
			id: 1,
			posters: [],
			backdrops: [],
			logos: [image('/one.png'), image('/two.png')],
			all: []
		},
		...overrides
	};
}

describe('showLogoUrl', () => {
	it('takes the first logo the author enabled', () => {
		// More than one enabled is an authoring choice about what *may* be used; the
		// card says the show with one of them, and it is always the same one.
		expect(showLogoUrl(entry({ enabledImages: { logo: ['/two.png', '/one.png'] } }))).toBe(
			'http://tmdb.test/w342/two.png'
		);
	});

	it('reads a logo at gallery size, not full resolution', () => {
		// A logo is drawn at a card's width — an `original` PNG would be megabytes for
		// a strip a hundred pixels wide.
		expect(showLogoUrl(entry({ enabledImages: { logo: ['/one.png'] } }))).toBe(
			'http://tmdb.test/w342/one.png'
		);
	});

	it('returns null when the author has enabled no logo', () => {
		// No fallback to an arbitrary logo: TMDB holds dozens per show (dubs, seasons,
		// languages), so an un-authored pick would say the show wrong. The statue
		// leaves the line out instead.
		expect(showLogoUrl(entry())).toBeNull();
		expect(showLogoUrl(entry({ enabledImages: {} }))).toBeNull();
		expect(showLogoUrl(entry({ enabledImages: { poster: ['/p.png'] } }))).toBeNull();
	});

	it('returns null when the enabled path is no longer among the images', () => {
		// The enabled list is stored as file paths against a separately stored image
		// list, so the two can drift; a dangling path reads as "no logo".
		expect(showLogoUrl(entry({ enabledImages: { logo: ['/gone.png'] } }))).toBeNull();
	});

	it('resolves every enabled logo in the shipped collection', () => {
		// The real data, so an enabled path that no longer matches an image (or an
		// entry that lost its logos) fails here rather than blanking a card's row.
		const collection = JSON.parse(readFileSync(SHOWS_JSON, 'utf8')) as ShowsCollection;
		const enabled = collection.shows.filter((show) => show.enabledImages?.logo?.length);
		expect(enabled.length).toBeGreaterThan(0);
		for (const show of enabled) {
			expect(showLogoUrl(show), show.show.name).not.toBeNull();
		}
	});
});
