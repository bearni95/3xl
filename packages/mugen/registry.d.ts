/**
 * Types for ./registry.js. The MUGEN scripts are plain JS (they run under bare
 * `node`), but @3xl/backend imports this one under TypeScript, so it needs a
 * declaration to be reachable from there.
 */

/**
 * Rewrite @3xl/data's registry.generated.ts from every definition JSON on disk.
 * Returns how many characters the registry now lists.
 */
export function regenerateRegistry(): number;
