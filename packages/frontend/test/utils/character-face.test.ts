import { describe, it, expect, afterEach, vi } from 'vitest';
import { resolveCharacterFace } from '$utils/mugen/character-face';
import type { Manifest } from '$utils/mugen/mugen-player';
import type { CharacterDefinition } from '$types/character-definition.type';

/**
 * Serve one character's two JSON reads — the frames manifest and the definition —
 * so the resolver can be exercised without the network.
 */
function serve(manifest: Partial<Manifest>, definition: Partial<CharacterDefinition>): void {
	vi.stubGlobal('fetch', (url: string) =>
		Promise.resolve({
			ok: true,
			json: () => Promise.resolve(url.endsWith('manifest.json') ? manifest : definition)
		})
	);
}

// A tall portrait, the shape MUGEN's group-9000 sprites usually take.
const manifest: Partial<Manifest> = {
	face: { file: 'spr_9000_1.png', width: 180, height: 384 },
	faces: [
		{ file: 'spr_9000_0.png', width: 25, height: 25 },
		{ file: 'spr_9000_1.png', width: 180, height: 384 }
	]
} as Partial<Manifest>;

afterEach(() => vi.unstubAllGlobals());

describe('resolving a character face', () => {
	it('frames the default square when no crop is authored', async () => {
		serve(manifest, {});
		const face = await resolveCharacterFace('chopper', '/assets/chopper/frames');
		// Top-anchored and as wide as the sprite allows — never the whole portrait.
		expect(face?.crop).toEqual({ x: 0, y: 0, size: 180 });
		expect(face?.url).toBe('/assets/chopper/frames/spr_9000_1.png');
	});

	it('honours the square authored on the picked portrait', async () => {
		serve(manifest, { face: 'spr_9000_1.png', faceCrop: { x: 20, y: 40, size: 120 } });
		const face = await resolveCharacterFace('chopper', '/assets/chopper/frames');
		expect(face?.crop).toEqual({ x: 20, y: 40, size: 120 });
	});

	it('clamps an authored square that overhangs the sprite', async () => {
		serve(manifest, { face: 'spr_9000_1.png', faceCrop: { x: 900, y: 900, size: 900 } });
		const face = await resolveCharacterFace('chopper', '/assets/chopper/frames');
		expect(face?.crop).toEqual({ x: 0, y: 204, size: 180 });
	});

	it('ignores a square left over from an unpicked portrait, defaulting instead', async () => {
		// No face picked, so the manifest default is shown — and the stored crop is
		// in some other sprite's pixels, so it cannot follow it there.
		serve(manifest, { faceCrop: { x: 5, y: 5, size: 15 } });
		const face = await resolveCharacterFace('chopper', '/assets/chopper/frames');
		expect(face?.crop).toEqual({ x: 0, y: 0, size: 180 });
		expect(face?.url).toBe('/assets/chopper/frames/spr_9000_1.png');
	});

	it('frames the picked portrait rather than the manifest default', async () => {
		serve(manifest, { face: 'spr_9000_0.png' });
		const face = await resolveCharacterFace('chopper', '/assets/chopper/frames');
		expect(face?.crop).toEqual({ x: 0, y: 0, size: 25 });
		expect(face?.url).toBe('/assets/chopper/frames/spr_9000_0.png');
	});

	it('leaves the crop null when the manifest never sized the sprite', async () => {
		serve({ face: { file: 'spr_9000_1.png' } } as Partial<Manifest>, {});
		const face = await resolveCharacterFace('chopper', '/assets/chopper/frames');
		expect(face?.crop).toBeNull();
	});

	it('returns nothing for a character that ships no portrait', async () => {
		serve({}, {});
		expect(await resolveCharacterFace('jelly-jiggler', '/assets/jelly-jiggler/frames')).toBeNull();
	});
});
