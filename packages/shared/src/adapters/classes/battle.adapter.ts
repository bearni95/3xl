import { AdapterClass } from './adapter.class';
import { isSpawnColor } from '../../utils/spawn/color';
import type { TeamMemberRoll } from '../../utils/spawn/municipality-team';
import { SpawnColor } from '../../types/character-spawn.type';
import type {
	BattleBoardSnapshot,
	BattleFighterSnapshot,
	BattleOrder,
	BattleSide,
	OpenBattle,
	OpenBattleRow
} from '../../types/battle.type';

const SIDES: BattleSide[] = ['info', 'error'];
const ORDERS: BattleOrder[] = ['charge', 'defend', 'shoot'];

/**
 * Transforms `battles` rows between Supabase's snake_case shape and the internal
 * open-battle model.
 *
 * Both the rival line-up and the board travel as `jsonb`, so they arrive as
 * `unknown` and are parsed defensively here: a row whose board cannot be read is
 * reported as no board at all rather than as a half-restored fight, which the
 * arena then treats as a battle opened and never played (it starts the encounter
 * from turn one against the stored rivals). Nothing here trusts the shape — the
 * board is written by a browser, and a battle that fails to parse must degrade to
 * something playable rather than throw inside a page load.
 */
export class BattleAdapter extends AdapterClass {
	constructor() {
		super('battle');
	}

	/** Transform a raw `battles` row into the internal model. */
	fromRow(row: OpenBattleRow): OpenBattle {
		return {
			locationId: row.location_id,
			turnover: Math.max(0, Math.trunc(Number(row.turnover ?? 0)) || 0),
			rivals: this.rivalsFromJson(row.rivals),
			board: this.boardFromJson(row.board),
			startedAt: row.started_at
		};
	}

	/**
	 * Parse the stored rival line-up, skipping any entry without a usable character
	 * id. The colour falls back exactly as a spawn's would, so a line-up written by
	 * an older client still fields somebody.
	 */
	rivalsFromJson(value: unknown): TeamMemberRoll[] {
		if (!Array.isArray(value)) return [];
		const rivals: TeamMemberRoll[] = [];
		for (const entry of value) {
			if (!entry || typeof entry !== 'object') continue;
			const record = entry as Record<string, unknown>;
			const characterId = typeof record.character_id === 'string' ? record.character_id : '';
			if (!characterId) continue;
			rivals.push({
				characterId,
				color: isSpawnColor(record.color) ? record.color : SpawnColor.Red
			});
		}
		return rivals;
	}

	/** The rival line-up on its way back to Postgres, in lane order. */
	rivalsToJson(rivals: readonly TeamMemberRoll[]): { character_id: string; color: string }[] {
		return rivals.map((rival) => ({
			character_id: rival.characterId,
			color: rival.color
		}));
	}

	/**
	 * Parse a stored board. Returns null for anything that is not a readable
	 * snapshot — no turn, no fighters, or fighters that do not carry the spawn and
	 * lane a fight has to be rebuilt from.
	 */
	boardFromJson(value: unknown): BattleBoardSnapshot | null {
		if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
		const record = value as Record<string, unknown>;
		const turn = Math.trunc(Number(record.turn ?? 0));
		if (!Number.isFinite(turn) || turn < 1) return null;
		if (!Array.isArray(record.fighters) || record.fighters.length === 0) return null;

		const fighters: BattleFighterSnapshot[] = [];
		for (const entry of record.fighters) {
			const fighter = this.fighterFromJson(entry);
			if (!fighter) return null;
			fighters.push(fighter);
		}
		return { turn, fighters };
	}

	private fighterFromJson(value: unknown): BattleFighterSnapshot | null {
		if (!value || typeof value !== 'object') return null;
		const record = value as Record<string, unknown>;

		const side = record.side;
		if (!SIDES.includes(side as BattleSide)) return null;
		const slot = Math.trunc(Number(record.slot ?? -1));
		if (!Number.isFinite(slot) || slot < 0) return null;
		const spawnId = typeof record.spawnId === 'string' ? record.spawnId : '';
		if (!spawnId) return null;

		const action = ORDERS.includes(record.action as BattleOrder)
			? (record.action as BattleOrder)
			: null;
		const cell = record.cell;
		const parsedCell =
			cell && typeof cell === 'object'
				? {
						q: Math.trunc(Number((cell as Record<string, unknown>).q ?? 0)) || 0,
						r: Math.trunc(Number((cell as Record<string, unknown>).r ?? 0)) || 0
					}
				: null;

		return {
			side: side as BattleSide,
			slot,
			spawnId,
			charges: Math.max(0, Math.trunc(Number(record.charges ?? 0)) || 0),
			down: record.down === true,
			guardSpent: record.guardSpent === true,
			action,
			bonus: record.bonus === true,
			cell: parsedCell
		};
	}
}

export const battleAdapter = new BattleAdapter();
