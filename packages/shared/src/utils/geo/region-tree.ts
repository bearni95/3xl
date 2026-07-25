/**
 * Groups the flat municipality polygons into the map's nested divisions, drawn
 * red / yellow / green / blue: territory (red) → province (yellow) → comarca
 * (green) → municipality (blue). Built purely from `municipis.json`, whose every
 * feature carries its own `territory`, `prov` and `comarca` names, so no extra
 * layer is fetched.
 *
 * The province tier only appears where it genuinely subdivides a territory —
 * i.e. a territory with more than one province (the Spanish provincias of
 * Catalunya and País Valencià). Territories with a single province (its name
 * mirrors the territory: Illes Balears, Catalunya Nord, Andorra, l'Alguer) skip
 * the tier and list their comarques directly. A handful of municipalities
 * (Andorra, l'Alguer) also have no comarca and hang directly off their parent.
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

/** A yellow province: its comarques plus any comarca-less municipalities. */
export interface RegionProvince {
	id: string;
	name: string;
	comarques: RegionComarca[];
	/** Municipalities with no comarca, shown directly under the province. */
	municipis: RegionMunicipality[];
	/** Total municipalities in the province, across all comarques. */
	count: number;
	/** The most common show across every municipality in the province. */
	show?: RegionShow;
}

/**
 * A red territory. When it has more than one province, its subtree hangs off
 * `provincies` and `comarques`/`municipis` are empty; otherwise the province
 * tier is skipped and `comarques`/`municipis` carry the subtree directly.
 */
export interface RegionTerritory {
	id: string;
	name: string;
	/** Populated only for multi-province territories (Spanish provincias). */
	provincies: RegionProvince[];
	/** Comarques listed directly, when the territory has no province tier. */
	comarques: RegionComarca[];
	/** Comarca-less municipalities (Andorra, l'Alguer), shown directly. */
	municipis: RegionMunicipality[];
	/** Total municipalities under this territory, across everything within. */
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

/** Raw accumulator for one province before shows are attached and it's sorted. */
interface RawProvince {
	id: string;
	name: string;
	comarques: Map<string, RegionComarca>;
	municipis: RegionMunicipality[];
	count: number;
}

/**
 * Builds the territory → province → comarca → municipality tree from the
 * municipality GeoJSON. Territories are ordered by municipality count (largest
 * first, so Catalunya leads); every other tier is sorted by name.
 */
export function buildRegionTree(
	municipalities: GeoJSON.FeatureCollection | null | undefined,
	shows?: Map<string, RegionShow>
): RegionTerritory[] {
	if (!municipalities) return [];

	const territories = new Map<
		string,
		{ id: string; name: string; provinces: Map<string, RawProvince>; count: number }
	>();

	for (const feature of municipalities.features) {
		const props = feature.properties ?? {};
		const territoryName = String(props.territory ?? 'Unknown');
		const provinceName = String(props.prov ?? territoryName);
		const municipality: RegionMunicipality = {
			id: String(props.id ?? props.name ?? ''),
			name: String(props.name ?? 'Unknown')
		};

		let territory = territories.get(territoryName);
		if (!territory) {
			territory = { id: slugify(territoryName), name: territoryName, provinces: new Map(), count: 0 };
			territories.set(territoryName, territory);
		}
		territory.count += 1;

		let province = territory.provinces.get(provinceName);
		if (!province) {
			province = { id: slugify(provinceName), name: provinceName, comarques: new Map(), municipis: [], count: 0 };
			territory.provinces.set(provinceName, province);
		}
		province.count += 1;

		const comarcaName = props.comarca ? String(props.comarca) : null;
		if (!comarcaName) {
			province.municipis.push(municipality);
			continue;
		}

		let comarca = province.comarques.get(comarcaName);
		if (!comarca) {
			comarca = { id: slugify(comarcaName), name: comarcaName, municipis: [] };
			province.comarques.set(comarcaName, comarca);
		}
		comarca.municipis.push(municipality);
	}

	const withShow = (municipality: RegionMunicipality): RegionMunicipality => {
		const show = shows?.get(municipality.id);
		return show ? { ...municipality, show } : municipality;
	};

	// Resolve one raw province into its sorted comarques + direct municipalities.
	const resolveProvince = (raw: RawProvince) => {
		const comarques = [...raw.comarques.values()]
			.map((comarca) => {
				const municipis = comarca.municipis.map(withShow).sort(byName);
				return { ...comarca, municipis, show: majorityShow(municipis) };
			})
			.sort(byName);
		const municipis = raw.municipis.map(withShow).sort(byName);
		const everyMunicipality = [...comarques.flatMap((comarca) => comarca.municipis), ...municipis];
		return { comarques, municipis, everyMunicipality };
	};

	return [...territories.values()]
		.map((territory) => {
			const rawProvinces = [...territory.provinces.values()];
			const everyMunicipality: RegionMunicipality[] = [];

			// Only the Spanish provincias (a territory with >1 province) get a
			// province tier; a lone province is redundant, so flatten it away.
			if (rawProvinces.length > 1) {
				const provincies = rawProvinces
					.map((raw) => {
						const { comarques, municipis, everyMunicipality: within } = resolveProvince(raw);
						everyMunicipality.push(...within);
						return {
							id: raw.id,
							name: raw.name,
							count: raw.count,
							comarques,
							municipis,
							show: majorityShow(within)
						};
					})
					.sort(byName);
				return {
					id: territory.id,
					name: territory.name,
					count: territory.count,
					provincies,
					comarques: [],
					municipis: [],
					show: majorityShow(everyMunicipality)
				};
			}

			const { comarques, municipis, everyMunicipality: within } = resolveProvince(rawProvinces[0]);
			return {
				id: territory.id,
				name: territory.name,
				count: territory.count,
				provincies: [],
				comarques,
				municipis,
				show: majorityShow(within)
			};
		})
		.sort((a, b) => b.count - a.count);
}
