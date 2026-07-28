// The siege counter, rolled up the region tree.
//
// A siege is a municipality thing: how many wins the reader has banked against
// the team sitting on one town, and how many it takes to shift it. Both figures
// come out of Supabase — the town's `municipality_holders` row (its turnover sets
// the bar) and the reader's own `municipality_sieges` row (RLS-scoped, so it is
// nobody else's) — with the untaken, seed-rolled town as the fallback: no holder
// row means the bar is a single win, and no siege row means nothing banked.
//
// A region above a municipality has no siege of its own, so it carries the sum of
// every town beneath it: a comarca's counter is what taking the whole comarca
// would cost and how far its towns have got, and a province's is the sum of its
// comarques. Summing (rather than averaging or counting held towns) is what keeps
// a parent's counter equal to the counters listed under it when you drill in.

import { siegeProgress, type MunicipalityHolder, type MunicipalitySiege } from '../../types/territory.type';
import type { RegionNode } from './region-tree';

/** One region's siege counter: wins banked over wins needed, both summed for groupings. */
export interface RegionSiege {
	/** Wins the reader has banked across every municipality in this region. */
	wins: number;
	/** Wins it would take to hold every municipality in this region. */
	required: number;
}

/**
 * Every region's siege counter, keyed by node key — municipalities from the
 * holder/siege sets, and each grouping above them from the sum of its children.
 *
 * One post-order pass over the whole tree, so a parent's total is built from the
 * child totals rather than re-walking its subtree per row.
 */
export function buildRegionSieges(
	nodes: RegionNode[],
	holders: ReadonlyMap<string, MunicipalityHolder>,
	sieges: ReadonlyMap<string, MunicipalitySiege>
): Map<string, RegionSiege> {
	const totals = new Map<string, RegionSiege>();

	const walk = (node: RegionNode): RegionSiege => {
		let total: RegionSiege;
		if (node.type === 'Municipality') {
			// A town's key IS its geojson feature id, which is what both Supabase
			// tables are keyed by — so this reads the real record whenever there is
			// one, and the seeded 0/1 when there isn't.
			const progress = siegeProgress(node.key, holders, sieges);
			total = { wins: progress.wins, required: progress.required };
		} else {
			total = { wins: 0, required: 0 };
			for (const child of node.children) {
				const below = walk(child);
				total.wins += below.wins;
				total.required += below.required;
			}
		}
		totals.set(node.key, total);
		return total;
	};

	for (const node of nodes) walk(node);
	return totals;
}
