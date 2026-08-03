/**
 * Hand a blob to the browser as a file the author keeps.
 *
 * An anchor with a `download` on it, clicked without ever being in the document — which is
 * all a "save this" is once the bytes are already in hand. The object URL is released on a
 * later task rather than straight after the click: revoking it in the same tick can beat the
 * download's own read of it, and a video is large enough for that race to be real.
 */
export function saveBlob(blob: Blob, filename: string): void {
	const url = URL.createObjectURL(blob);
	const anchor = document.createElement('a');
	anchor.href = url;
	anchor.download = filename;
	anchor.click();
	setTimeout(() => URL.revokeObjectURL(url), 1000);
}
