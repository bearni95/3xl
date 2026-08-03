import type { Manifest, ManifestFace } from '$utils/mugen/mugen-player';
import type { CharacterDefinition, FaceCrop } from '$types/character-definition.type';
import { clampFaceCrop, defaultFaceCrop } from '$utils/mugen/face-crop';

/** A character's active portrait: the file, its intrinsic size, and its framing. */
export interface CharacterFace {
	/** Absolute URL of the portrait file, under the character's `basePath`. */
	url: string;
	/** The sprite's own pixel size, from the manifest — the crop's coordinate space. */
	width: number;
	height: number;
	/**
	 * The square framed on this portrait in the admin Faces tab, already clamped
	 * to the sprite — falling back to {@link defaultFaceCrop}, the very square that
	 * screen shows before anyone drags it, so a face is *always* framed to a
	 * square. Null only when the manifest doesn't describe the sprite's size, and
	 * there is no pixel space to crop in.
	 */
	crop: FaceCrop | null;
}

/**
 * Resolve the "active face" for a character: the face the definition picked on
 * the admin `/characters/dashboard/<id>/faces` screen (`definition.face`), else the manifest's
 * default (`manifest.face`), together with the square that screen framed on it
 * (`definition.faceCrop`). Returns null when the character ships no portrait.
 *
 * `id` is the registry/data id (used to fetch `/data/characters/<id>/definition.json`);
 * `basePath` is the served frames folder (e.g. `/assets/<id>/frames`).
 */
export async function resolveCharacterFace(
	id: string,
	basePath: string
): Promise<CharacterFace | null> {
	const [manifestRes, defRes] = await Promise.all([
		fetch(`${basePath}/manifest.json`),
		fetch(`/data/characters/${id}/definition.json`)
	]);
	const manifest: Partial<Manifest> = manifestRes.ok ? await manifestRes.json() : {};
	const definition: Partial<CharacterDefinition> = defRes.ok ? await defRes.json() : {};
	const faceFile = definition.face || manifest.face?.file || null;
	if (!faceFile) return null;

	// The crop is in the sprite's pixels, so it needs that sprite's entry. The
	// enumerated `faces` list postdates some manifests; fall back to the default
	// face when it describes the same file.
	const entry: ManifestFace | null =
		manifest.faces?.find((face) => face.file === faceFile) ??
		(manifest.face?.file === faceFile ? manifest.face : null);
	const width = entry?.width ?? 0;
	const height = entry?.height ?? 0;
	// A stored crop is in one specific sprite's pixels, so it only counts while it
	// is that sprite that's picked — exactly the rule the admin Faces tab applies.
	// With none (or one authored against another portrait) the face still gets a
	// square: the default one that screen frames, top-anchored and centred.
	const stored = definition.face === faceFile ? (definition.faceCrop ?? null) : null;
	const crop =
		width > 0 && height > 0
			? clampFaceCrop(stored ?? defaultFaceCrop(width, height), width, height)
			: null;

	return { url: `${basePath}/${faceFile}`, width, height, crop };
}

/**
 * {@link resolveCharacterFace}, keeping only the portrait URL — for the screens
 * that show a face at its natural framing (roster, boosters, the board).
 */
export async function resolveCharacterFaceUrl(
	id: string,
	basePath: string
): Promise<string | null> {
	return (await resolveCharacterFace(id, basePath))?.url ?? null;
}

/**
 * Per-character memo of {@link resolveCharacterFace}. A character's active face
 * is authored data that cannot change while the page is open, so the two JSON
 * reads behind it are worth doing once per id — screens that show the whole
 * roster at once (the avatar picker) and screens that show one portrait over and
 * over (the account card) then share the same in-flight promise.
 */
const faceCache = new Map<string, Promise<CharacterFace | null>>();

/** {@link resolveCharacterFace}, resolved at most once per character id. */
export function characterFace(id: string, basePath: string): Promise<CharacterFace | null> {
	const cached = faceCache.get(id);
	if (cached) return cached;
	// Don't cache a failure: a transient fetch error would otherwise stick for the
	// rest of the session.
	const pending = resolveCharacterFace(id, basePath).catch((error) => {
		faceCache.delete(id);
		throw error;
	});
	faceCache.set(id, pending);
	return pending;
}

/** {@link characterFace}, keeping only the portrait URL. */
export async function characterFaceUrl(id: string, basePath: string): Promise<string | null> {
	return (await characterFace(id, basePath))?.url ?? null;
}
