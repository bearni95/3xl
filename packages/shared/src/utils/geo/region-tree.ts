/**
 * Groups the flat municipality polygons into the three-tier map hierarchy that
 * the map draws in red / green / blue: territory (red) → comarca (green) →
 * municipality (blue). Built purely from `municipis.json`, whose every feature
 * carries its own `territory` and `comarca` names, so no extra layer is fetched.
 *
 * A handful of municipalities (Andorra, l'Alguer) have no comarca tier; those
 * hang directly off their territory in `RegionTerritory.municipis`.
 */

/** The trimmed show shape shown against a region (matches MunicipalityShow.show). */
export interface RegionShow {
	id: number;
	name: string;
	posterUrl: string | null;
}

/** A single blue municipality — the leaf of the tree. */
export interface RegionMunicipality {
	id: string;
	name: string;
	/** The seeded show assigned to this municipality, when a lookup is given. */
	show?: RegionShow;
}

/** A green comarca grouping the municipalities within it. */
export interface RegionComarca {
	/** Slug key, unique within its territory. */
	id: string;
	name: string;
	municipis: RegionMunicipality[];
	/** The most common show among this comarca's municipalities (simple count). */
	show?: RegionShow;
}

/** A red territory: its comarques plus any comarca-less municipalities. */
export interface RegionTerritory {
	id: string;
	name: string;
	comarques: RegionComarca[];
	/** Municipalities with no comarca (Andorra, l'Alguer), shown directly. */
	municipis: RegionMunicipality[];
	/** Total municipalities under this territory, across all comarques. */
	count: number;
	/** The most common show across every municipality in the territory. */
	show?: RegionShow;
}

/**
 * The plurality show among a set of municipalities: the one held by the most of
 * them (simple count), ties broken by name for a stable pick. Municipalities
 * with no show are ignored.
 */
function majorityShow(municipis: RegionMunicipality[]): RegionShow | undefined {
	const tally = new Map<number, { show: RegionShow; count: number }>();
	for (const municipality of municipis) {
		if (!municipality.show) continue;
		const entry = tally.get(municipality.show.id);
		if (entry) entry.count += 1;
		else tally.set(municipality.show.id, { show: municipality.show, count: 1 });
	}

	let best: { show: RegionShow; count: number } | undefined;
	for (const entry of tally.values()) {
		if (
			!best ||
			entry.count > best.count ||
			(entry.count === best.count && entry.show.name.localeCompare(best.show.name, 'ca') < 0)
		) {
			best = entry;
		}
	}
	return best?.show;
}

function slugify(value: string): string {
	return value
		.toLowerCase()
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name, 'ca');

/**
 * Builds the territory → comarca → municipality tree from the municipality
 * GeoJSON. Territories are ordered by municipality count (largest first, so
 * Catalunya leads); comarques and municipalities are sorted by name.
 */
export function buildRegionTree(
	municipalities: GeoJSON.FeatureCollection | null | undefined,
	shows?: Map<string, RegionShow>
): RegionTerritory[] {
	if (!municipalities) return [];

	const territories = new Map<
		string,
		{
			id: string;
			name: string;
			comarques: Map<string, RegionComarca>;
			municipis: RegionMunicipality[];
			count: number;
		}
	>();

	for (const feature of municipalities.features) {
		const props = feature.properties ?? {};
		const territoryName = String(props.territory ?? 'Unknown');
		const municipality: RegionMunicipality = {
			id: String(props.id ?? props.name ?? ''),
			name: String(props.name ?? 'Unknown')
		};

		let territory = territories.get(territoryName);
		if (!territory) {
			territory = {
				id: slugify(territoryName),
				name: territoryName,
				comarques: new Map(),
				municipis: [],
				count: 0
			};
			territories.set(territoryName, territory);
		}
		territory.count += 1;

		const comarcaName = props.comarca ? String(props.comarca) : null;
		if (!comarcaName) {
			territory.municipis.push(municipality);
			continue;
		}

		let comarca = territory.comarques.get(comarcaName);
		if (!comarca) {
			comarca = { id: slugify(comarcaName), name: comarcaName, municipis: [] };
			territory.comarques.set(comarcaName, comarca);
		}
		comarca.municipis.push(municipality);
	}

	const withShow = (municipality: RegionMunicipality): RegionMunicipality => {
		const show = shows?.get(municipality.id);
		return show ? { ...municipality, show } : municipality;
	};

	return [...territories.values()]
		.map((territory) => {
			const comarques = [...territory.comarques.values()]
				.map((comarca) => {
					const municipis = comarca.municipis.map(withShow).sort(byName);
					return { ...comarca, municipis, show: majorityShow(municipis) };
				})
				.sort(byName);
			const directMunicipis = territory.municipis.map(withShow).sort(byName);
			const everyMunicipality = [
				...comarques.flatMap((comarca) => comarca.municipis),
				...directMunicipis
			];
			return {
				id: territory.id,
				name: territory.name,
				count: territory.count,
				comarques,
				municipis: directMunicipis,
				show: majorityShow(everyMunicipality)
			};
		})
		.sort((a, b) => b.count - a.count);
}
