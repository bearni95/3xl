import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { characters } from '@3xl/data';
import { definitionAnimations } from '$utils/mugen/definition-animations';
import type { CharacterDefinition } from '$types/character-definition.type';

// The two real trees the app serves: authored definitions at /data/characters, and
// decoded frames + manifests at /assets.
const DEFINITIONS = join(__dirname, '../../../data/public/characters');
const ASSETS = join(__dirname, '../../../assets/public');

const definitionOf = (id: string) =>
	JSON.parse(
		readFileSync(join(DEFINITIONS, id, 'definition.json'), 'utf8')
	) as CharacterDefinition;

const manifestAnimationsOf = (id: string) =>
	Object.keys(
		(
			JSON.parse(
				readFileSync(join(ASSETS, id, 'frames', 'manifest.json'), 'utf8')
			) as { animations: Record<string, unknown> }
		).animations
	);

/** A definition with every slot bound, to read the ordering off. */
function complete(): CharacterDefinition {
	return {
		id: 'test',
		label: 'Test',
		basePath: '/assets/test/frames',
		animations: { idle: { source: 'idle', loop: true }, hurt: { source: 'action-5000', loop: false } },
		directions: {
			'move-left': { source: 'walk-back', loop: true },
			'move-right': { source: 'walk', loop: true }
		},
		moves: [
			{ name: 'Puny', type: 'melee', source: 'action-200' },
			{ name: 'Kamehameha', type: 'ranged', source: 'action-1000' },
			{ name: 'Defend', type: 'defend', source: 'guard-stand' }
		],
		stats: { atk: 5, def: 5, hp: 5 },
		color: 'purple'
	};
}

describe('definitionAnimations', () => {
	it('reads the character standing, then moving, then hit, then its moves', () => {
		expect(definitionAnimations(complete())).toEqual([
			{ label: 'idle', source: 'idle' },
			{ label: 'move-left', source: 'walk-back' },
			{ label: 'move-right', source: 'walk' },
			{ label: 'hurt', source: 'action-5000' },
			{ label: 'Puny', source: 'action-200' },
			{ label: 'Kamehameha', source: 'action-1000' },
			{ label: 'Defend', source: 'guard-stand' }
		]);
	});

	it('leaves out slots the definition has not bound', () => {
		const definition = complete();
		definition.animations.hurt.source = '';
		definition.directions['move-left'].source = '';
		definition.moves[1].source = '';

		expect(definitionAnimations(definition).map((a) => a.label)).toEqual([
			'idle',
			'move-right',
			'Puny',
			'Defend'
		]);
	});

	it('labels an unnamed move by its type', () => {
		const definition = complete();
		definition.moves = [{ name: '  ', type: 'melee', source: 'action-200' }];

		expect(definitionAnimations(definition)).toEqual([
			{ label: 'idle', source: 'idle' },
			{ label: 'move-left', source: 'walk-back' },
			{ label: 'move-right', source: 'walk' },
			{ label: 'hurt', source: 'action-5000' },
			{ label: 'melee', source: 'action-200' }
		]);
	});

	it('survives a definition missing whole sections', () => {
		const bare = { id: 'x', label: 'X', basePath: '' } as unknown as CharacterDefinition;
		expect(definitionAnimations(bare)).toEqual([]);
	});

	// The previews are mounted against the character's manifest, so a definition
	// naming an animation the sheet doesn't have would render an empty box.
	it('names only animations the real characters actually have', () => {
		for (const character of characters) {
			const available = new Set(manifestAnimationsOf(character.id));
			for (const { label, source } of definitionAnimations(definitionOf(character.id))) {
				expect(available.has(source), `${character.id} ${label} → ${source}`).toBe(true);
			}
		}
	});
});
