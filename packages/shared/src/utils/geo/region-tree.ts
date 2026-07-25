/**
 * Groups the flat municipality polygons into the three-tier map hierarchy that
 * the map draws in red / green / blue: territory (red) → comarca (green) →
 * municipality (blue). Built purely from `municipis.json`, whose every feature
 * carries its own `territory` and `comarca` names, so no extra layer is fetched.
 *
 * A handful of municipalities (Andorra, l'Alguer) have no comarca tier; those
 * hang directly off their territory in `RegionTerritory.municipis`.
 */

/** A single blue municipality — the leaf of the tree. */
export interface RegionMunicipality {
	id: string;
	name: string;
}

/** A green comarca grouping the municipalities within it. */
export interface RegionComarca {
	/** Slug key, unique within its territory. */
	id: string;
	name: string;
	municipis: RegionMunicipality[];
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
	municipalities: GeoJSON.FeatureCollection | null | undefined
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

	return [...territories.values()]
		.map((territory) => ({
			id: territory.id,
			name: territory.name,
			count: territory.count,
			comarques: [...territory.comarques.values()]
				.map((comarca) => ({
					...comarca,
					municipis: comarca.municipis.slice().sort(byName)
				}))
				.sort(byName),
			municipis: territory.municipis.slice().sort(byName)
		}))
		.sort((a, b) => b.count - a.count);
}
