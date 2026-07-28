import type { Manifest } from '$utils/mugen/mugen-player';
import type { CharacterDefinition } from '$types/character-definition.type';

/**
 * Resolve the "active face" portrait URL for a character: the face the definition
 * picked on the admin `/characters/faces` screen (`definition.face`), else the
 * manifest's default (`manifest.face`). Both are files under the character's
 * `basePath`. Returns null when neither is available.
 *
 * `id` is the registry/data id (used to fetch `/data/characters/<id>/definition.json`);
 * `basePath` is the served frames folder (e.g. `/assets/<id>/frames`).
 */
export async function resolveCharacterFaceUrl(
	id: string,
	basePath: string
): Promise<string | null> {
	const [manifestRes, defRes] = await Promise.all([
		fetch(`${basePath}/manifest.json`),
		fetch(`/data/characters/${id}/definition.json`)
	]);
	const manifest: Partial<Manifest> = manifestRes.ok ? await manifestRes.json() : {};
	const definition: Partial<CharacterDefinition> = defRes.ok ? await defRes.json() : {};
	const faceFile = definition.face || manifest.face?.file || null;
	return faceFile ? `${basePath}/${faceFile}` : null;
}

/**
 * Per-character memo of {@link resolveCharacterFaceUrl}. A character's active
 * face is authored data that cannot change while the page is open, so the two
 * JSON reads behind it are worth doing once per id — screens that show the whole
 * roster at once (the avatar picker) and screens that show one portrait over and
 * over (the account card) then share the same in-flight promise.
 */
const faceUrlCache = new Map<string, Promise<string | null>>();

/** {@link resolveCharacterFaceUrl}, resolved at most once per character id. */
export function characterFaceUrl(id: string, basePath: string): Promise<string | null> {
	const cached = faceUrlCache.get(id);
	if (cached) return cached;
	// Don't cache a failure: a transient fetch error would otherwise stick for the
	// rest of the session.
	const pending = resolveCharacterFaceUrl(id, basePath).catch((error) => {
		faceUrlCache.delete(id);
		throw error;
	});
	faceUrlCache.set(id, pending);
	return pending;
}
