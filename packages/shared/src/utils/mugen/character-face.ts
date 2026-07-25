import type { Manifest } from '$utils/mugen/mugen-player';
import type { CharacterDefinition } from '$types/character-definition.type';

/**
 * Resolve the "active face" portrait URL for a character: the face the definition
 * picked in the admin `/characters` faces tab (`definition.face`), else the
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
