/**
 * Groups the flat municipality polygons into the map's nested divisions, drawn
 * red / yellow / green / blue: territory (red) → province (yellow) → comarca
 * (green) → municipality (blue). Built purely from `municipis.json`, whose every
 * feature carries its own `territory`, `prov` and `comarca` names, so no extra
 * layer is fetched.
 *
 * The province tier only appears where it genuinely subdivides a territory —
 * i.e. a territory with more than one entry in the `prov` field (the Spanish
 * provincias of País Valencià, and Catalunya's vegueries, which replace its four
 * provinces in the geo build). Territories with a single province (its name
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
 * A stable expand/collapse + fill key for a node, unique across the whole tree:
 * a territory is its own id; deeper tiers append their id to the parent's key.
 * The sidebar toggles these keys and the map reads them, so both agree on which
 * region a click opens and which poster a polygon shows.
 */
export function joinKey(parentKey: string, id: string): string {
	return `${parentKey}/${id}`;
}

/** The four region tiers, matching the map's red/yellow/green/blue divisions. */
export type RegionType = 'Territory' | 'Province' | 'Comarca' | 'Municipality';

/** A flat row for the sidebar table: one region, its tier, and its top show. */
export interface RegionRow {
	/** Selection/fill key — the same key the map images (see buildFillIndex). */
	key: string;
	name: string;
	type: RegionType;
	/** The region's plurality (top) show, when one is assigned. */
	show?: RegionShow;
}

/**
 * Flattens the nested region tree into one row per region across every tier,
 * each carrying the selection key the map paints by. The sidebar table filters
 * these by the active tier tab.
 */
export function flattenRegions(territories: RegionTerritory[]): RegionRow[] {
	const rows: RegionRow[] = [];

	const addMunicipality = (municipality: RegionMunicipality) => {
		rows.push({
			key: municipality.id,
			name: municipality.name,
			type: 'Municipality',
			show: municipality.show
		});
	};

	const addComarca = (parentKey: string, comarca: RegionComarca) => {
		rows.push({
			key: joinKey(parentKey, comarca.id),
			name: comarca.name,
			type: 'Comarca',
			show: comarca.show
		});
		comarca.municipis.forEach(addMunicipality);
	};

	for (const territory of territories) {
		rows.push({ key: territory.id, name: territory.name, type: 'Territory', show: territory.show });

		if (territory.provincies.length) {
			for (const province of territory.provincies) {
				const provinceKey = joinKey(territory.id, province.id);
				rows.push({ key: provinceKey, name: province.name, type: 'Province', show: province.show });
				for (const comarca of province.comarques) addComarca(provinceKey, comarca);
				province.municipis.forEach(addMunicipality);
			}
		} else {
			for (const comarca of territory.comarques) addComarca(territory.id, comarca);
			territory.municipis.forEach(addMunicipality);
		}
	}

	return rows;
}

/** One tier a municipality can be painted at: its region's key + that show's poster. */
export interface FillLevel {
	key: string;
	url: string | null;
}

/**
 * Precomputes, for every municipality, the ordered chain of fill tiers from its
 * territory down to itself (territory → [province] → [comarca] → municipality).
 * The map walks this chain against the set of expanded keys to pick the poster:
 * the shallowest tier whose region is still collapsed (or the municipality's own
 * show once every ancestor is open). Keys match the sidebar's toggle keys.
 */
export function buildFillIndex(territories: RegionTerritory[]): Map<string, FillLevel[]> {
	const index = new Map<string, FillLevel[]>();

	const leaf = (municipality: RegionMunicipality): FillLevel => ({
		key: municipality.id,
		url: municipality.show?.posterUrl ?? null
	});

	for (const territory of territories) {
		const territoryLevel: FillLevel = { key: territory.id, url: territory.show?.posterUrl ?? null };

		const addComarca = (above: FillLevel[], comarcaKey: string, comarca: RegionComarca) => {
			const comarcaLevel: FillLevel = { key: comarcaKey, url: comarca.show?.posterUrl ?? null };
			for (const municipality of comarca.municipis) {
				index.set(municipality.id, [...above, comarcaLevel, leaf(municipality)]);
			}
		};

		if (territory.provincies.length) {
			for (const province of territory.provincies) {
				const provinceKey = joinKey(territory.id, province.id);
				const provinceLevel: FillLevel = {
					key: provinceKey,
					url: province.show?.posterUrl ?? null
				};
				const above = [territoryLevel, provinceLevel];
				for (const comarca of province.comarques) {
					addComarca(above, joinKey(provinceKey, comarca.id), comarca);
				}
				for (const municipality of province.municipis) {
					index.set(municipality.id, [...above, leaf(municipality)]);
				}
			}
		} else {
			for (const comarca of territory.comarques) {
				addComarca([territoryLevel], joinKey(territory.id, comarca.id), comarca);
			}
			for (const municipality of territory.municipis) {
				index.set(municipality.id, [territoryLevel, leaf(municipality)]);
			}
		}
	}

	return index;
}

/**
 * Picks the tier a municipality is painted at: the shallowest ancestor still
 * collapsed, or the municipality's own leaf once every ancestor is expanded.
 */
export function resolveFill(levels: FillLevel[], expanded: Set<string>): FillLevel {
	for (let i = 0; i < levels.length - 1; i++) {
		if (!expanded.has(levels[i].key)) return levels[i];
	}
	return levels[levels.length - 1];
}

/**
 * The ids of every municipality that sits under a given fill key — i.e. whose
 * ancestor chain (or leaf) carries that key. Used to frame the map on a region:
 * the map fits to the union of these municipalities' polygons. A municipality's
 * own id returns just itself.
 */
export function municipalityIdsForKey(
	index: Map<string, FillLevel[]>,
	key: string
): Set<string> {
	const ids = new Set<string>();
	for (const [id, levels] of index) {
		if (levels.some((level) => level.key === key)) ids.add(id);
	}
	return ids;
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
