/**
 * Types for ./frame-edits.js. The MUGEN scripts are plain JS (they run under bare
 * `node`), but @3xl/backend imports this one under TypeScript, so it needs a
 * declaration to be reachable from there — same arrangement as ./registry.d.ts.
 */

/** A decoded manifest frame, as far as the record cares about one. */
export interface FrameEditFrame {
	file?: string;
	anchorX?: number;
	anchorY?: number;
	duration?: number;
}

/** One removed frame: where it sat in the fresh decode, and what it was. */
export interface FrameEdit {
	index: number;
	frame: FrameEditFrame | null;
}

/** One character's record, keyed by animation name. */
export interface FrameEdits {
	removed: Record<string, FrameEdit[]>;
}

/** Where one character's record lives. Throws on an id that isn't a folder name. */
export function frameEditsPath(id: string): string;

/** One character's record, or an empty one when it has none. Throws on bad JSON. */
export function readFrameEdits(id: string): FrameEdits;

/** Persist one character's record; an empty one deletes the file. */
export function writeFrameEdits(id: string, edits: FrameEdits): void;

/** A current position translated into the freshly decoded animation's numbering. */
export function originalIndex(removedIndices: number[], currentIndex: number): number;

/** A record plus one more deletion, taken at the manifest's current numbering. */
export function recordFrameRemoval(
	edits: FrameEdits,
	animation: string,
	index: number,
	frame: FrameEditFrame | undefined
): FrameEdits;

/** Replay a record onto a freshly decoded manifest, in place. */
export function applyFrameEdits(
	manifest: { animations?: Record<string, { frames: FrameEditFrame[] } | undefined> },
	edits: FrameEdits
): { dropped: number; kept: FrameEdits; warnings: string[] };
