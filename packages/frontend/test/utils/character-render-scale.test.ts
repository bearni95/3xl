import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { characters } from '@3xl/data';
import {
	characterIdFromFramesPath,
	readRenderScale
} from '$utils/mugen/character-render-scale';
import { characterFitScale, type FitFrame } from '$utils/card/character-fit';
import {
	DEFAULT_RENDER_SCALE,
	RENDER_SCALE_MAX,
	RENDER_SCALE_MIN,
	type CharacterDefinition
} from '$types/character-definition.type';

// The two real trees the app serves: authored definitions at /data/characters, and
// decoded frames + manifests at /assets.
const DEFINITIONS = join(__dirname, '../../../data/public/characters');
const ASSETS = join(__dirname, '../../../assets/public');

const definitionOf = (id: string) =>
	JSON.parse(
		readFileSync(join(DEFINITIONS, id, 'definition.json'), 'utf8')
	) as CharacterDefinition;

/** A character's real idle cycle, as the fit reads one. */
function idleFrames(id: string): FitFrame[] {
	const manifest = JSON.parse(readFileSync(join(ASSETS, id, 'frames', 'manifest.json'), 'utf8'));
	return manifest.animations.idle.frames.map(
		(frame: { width: number; height: number; anchorX: number }) => ({
			width: frame.width,
			height: frame.height,
			anchorX: frame.anchorX / frame.width
		})
	);
}

/** The tallest frame of a character's idle cycle, in its own source pixels — the
 * number the fit measures a character by. */
function idleHeight(id: string): number {
	return Math.max(...idleFrames(id).map((frame) => frame.height));
}

/** The side of the square a statue draws its character against, in CSS pixels. Any
 * number does: every character is measured against the same one, and the whole scheme
 * is a share of it. */
const STATUE_SQUARE = 300;

/** How tall a character is actually drawn on a statue, in that surface's pixels: the
 * statue's picture is a square with the character standing halfway up a floor a third
 * of it deep, so the room above their feet is five sixths of the square (see
 * CharacterStatue's GROUND_DEPTH and BASELINE), and the sheet is centred in it. */
function statueHeight(id: string): number {
	const frames = idleFrames(id);
	const room = { width: STATUE_SQUARE, height: (STATUE_SQUARE * 5) / 6 };
	const scale = characterFitScale(frames, room, readRenderScale(definitionOf(id)));
	return Math.max(...frames.map((frame) => frame.height)) * scale;
}

// The InuYasha cast, whose sheets are all drawn at roughly two thirds of the scale
// the Dragon Ball and One Piece sheets use. This list is the record of who was
// corrected for it: a character added to the show later, or one whose scale is lost
// by a re-import or an unrelated admin save, fails the checks below rather than
// quietly going back to standing a head shorter than its own castmates.
const INUYASHA_CAST = [
	'inuyasha',
	'youkai-inuyasha',
	'kagome',
	'kagura',
	'kikyo',
	'koga',
	'miroku',
	'sango',
	'seshomaru'
];

// Everyone who carries a correction at all. The InuYasha cast has one because their
// whole sheet is drawn small; Frieza has one for himself — his sprite is 118 px against
// Trunks' 136, so his pixels alone put him a head under a character he is meant to stand
// level with. Anything outside this list is drawn exactly as its pixels are, which the
// last check in this file holds.
const CORRECTED = [...INUYASHA_CAST, 'frieza'];

describe('characterIdFromFramesPath', () => {
	it('reads the character id out of a served frames folder', () => {
		expect(characterIdFromFramesPath('/assets/inuyasha/frames')).toBe('inuyasha');
		expect(characterIdFromFramesPath('/assets/eb-perfectcell-kofm/frames')).toBe(
			'eb-perfectcell-kofm'
		);
	});

	it('names no character for a path that identifies none', () => {
		expect(characterIdFromFramesPath(null)).toBeNull();
		expect(characterIdFromFramesPath('')).toBeNull();
		expect(characterIdFromFramesPath('/frames')).toBeNull();
	});

	it('resolves every registry character to its own definition file', () => {
		// This is the invariant the whole lookup rests on: a character's id, its frames
		// folder and its definition path are one name. If a folder is ever renamed or the
		// served path changes shape, this fails here — rather than every surface silently
		// drawing every character at 1.
		for (const character of characters) {
			const id = characterIdFromFramesPath(character.basePath);
			expect(id, character.basePath).toBe(character.id);
			expect(existsSync(join(DEFINITIONS, `${id}/definition.json`)), character.id).toBe(true);
		}
	});
});

describe('readRenderScale', () => {
	it('reads an authored scale', () => {
		expect(readRenderScale({ renderScale: 1.4 })).toBe(1.4);
	});

	it('falls back to no correction for anything absent or out of range', () => {
		for (const scale of [undefined, 0, -1, NaN, 40, 0.01]) {
			expect(readRenderScale({ renderScale: scale as number })).toBe(DEFAULT_RENDER_SCALE);
		}
		expect(readRenderScale(null)).toBe(DEFAULT_RENDER_SCALE);
		expect(readRenderScale({})).toBe(DEFAULT_RENDER_SCALE);
	});
});

describe('authored render scales', () => {
	it('keeps every stored scale inside the range the renderers accept', () => {
		// A scale outside the range is dropped by both the fit and the backend, so a
		// stored one that fell out of it would read as no correction at all.
		for (const character of characters) {
			const stored = definitionOf(character.id).renderScale;
			if (stored === undefined) continue;
			expect(Number.isFinite(stored), character.id).toBe(true);
			expect(stored, character.id).toBeGreaterThanOrEqual(RENDER_SCALE_MIN);
			expect(stored, character.id).toBeLessThanOrEqual(RENDER_SCALE_MAX);
		}
	});

	it('draws up every InuYasha character', () => {
		for (const id of INUYASHA_CAST) {
			expect(definitionOf(id).renderScale, id).toBeGreaterThan(1);
		}
	});

	it('stands the InuYasha cast well clear of the smallest characters', () => {
		// The complaint this field exists for: grown adults were coming out the size of
		// Chopper, who is a very small character. Measured against the real manifests, no
		// corrected character may read within half again of Chopper's own height.
		const floor = idleHeight('chopper') * 1.4;
		for (const id of INUYASHA_CAST) {
			const effective = idleHeight(id) * readRenderScale(definitionOf(id));
			expect(effective, id).toBeGreaterThan(floor);
		}
	});

	it('leaves every other character drawn exactly as its art is', () => {
		// The correction is not a knob anyone reaches for: a character whose art is drawn at
		// the roster's own scale carries no scale at all.
		for (const character of characters) {
			if (CORRECTED.includes(character.id)) continue;
			expect(definitionOf(character.id).renderScale, character.id).toBeUndefined();
		}
	});

	it('stands Frieza at Trunks height on a statue', () => {
		// What his scale is for, measured where it was asked for. Level to within a fifth of a
		// percent: standing him exactly level wants 136/118, and the definition carries the
		// round 1.15 instead — half a pixel on a 300 px statue, and a figure a person can read.
		expect(statueHeight('frieza') / statueHeight('eb-trunks')).toBeCloseTo(1, 2);
	});

	it('draws Frieza at his full height rather than fitting his tail to half the box', () => {
		// The scale only reaches him because the width cap measures the sweep his cycle
		// actually occupies. Measured off his axis instead — his tail reaches most of a
		// body-width to one side, and doubling that reach is the rule every surface here
		// used to apply — he stays below Trunks however high the scale is taken, so this is
		// the pair of decisions and not either one alone.
		const frames = idleFrames('frieza');
		const room = { width: STATUE_SQUARE, height: (STATUE_SQUARE * 5) / 6 };
		const height = Math.max(...frames.map((frame) => frame.height));
		const axisWidth =
			2 * Math.max(...frames.map((frame) => Math.max(frame.anchorX, 1 - frame.anchorX) * frame.width));
		const axisBound =
			Math.min(
				characterFitScale(frames, room, RENDER_SCALE_MAX),
				room.width / axisWidth
			) * height;
		expect(axisBound).toBeLessThan(statueHeight('eb-trunks'));
	});
});
