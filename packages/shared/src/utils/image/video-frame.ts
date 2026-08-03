/**
 * A still out of a video file, as a PNG.
 *
 * A portrait has to be a still image with a header something can measure: that is
 * what the whole upload store downstream is built on (see @3xl/mugen/custom-faces —
 * a face's pixel size is read off its own bytes, so the folder is the whole record).
 * A video has no such header, and nothing in this project decodes one.
 *
 * A browser does, though, and for free: it is already the thing that has to play
 * every format it accepts. So a video picked for a portrait is turned into a PNG
 * *here*, where it was picked, and what reaches the API is a still image like any
 * other — rather than teaching the store a format it cannot measure, or standing an
 * ffmpeg on the author's machine to answer one upload.
 *
 * Browser-only by nature: it wants a `<video>`, a `<canvas>` and a codec.
 */

/** How long a frame may take to arrive before the file is called undecodable. */
const DECODE_TIMEOUT_MS = 15_000;

/** Whether this file is one to run through {@link videoFrameDataUrl} at all. */
export function isVideoFile(file: File): boolean {
	return file.type.startsWith('video/') || /\.(?:webm|mp4|m4v|mov|ogv)$/i.test(file.name);
}

/** The same name under a `.png` extension, for the still taken out of it. */
export function videoStillName(name: string): string {
	return `${name.replace(/\.[^.]+$/, '') || 'face'}.png`;
}

/**
 * The video's first frame as a `data:image/png` URL — the very shape the faces API
 * takes, so a converted upload and a plain one travel the same road.
 *
 * The first frame rather than a chosen one: a portrait is a pose, and which pose a
 * clip should be reduced to is the author's call, not a heuristic's — they can trim
 * the file or pick another. Transparency survives, which is the point for the video
 * stickers this exists for: the canvas starts empty and only the frame is painted
 * onto it.
 */
export async function videoFrameDataUrl(file: File | Blob): Promise<string> {
	const url = URL.createObjectURL(file);
	const video = document.createElement('video');
	video.muted = true;
	video.playsInline = true;
	// Metadata alone would give the size but no pixels; a frame has to be decoded.
	video.preload = 'auto';
	video.src = url;
	try {
		await firstFrame(video);
		const width = video.videoWidth;
		const height = video.videoHeight;
		if (!(width > 0) || !(height > 0)) throw new Error('That video has no frames to take');
		const canvas = document.createElement('canvas');
		canvas.width = width;
		canvas.height = height;
		const context = canvas.getContext('2d');
		if (!context) throw new Error('This browser would not give a canvas to draw the frame on');
		context.drawImage(video, 0, 0, width, height);
		return canvas.toDataURL('image/png');
	} finally {
		// The element keeps decoding until it is told the source is gone, and the
		// object URL holds the whole file in memory until it is revoked.
		video.removeAttribute('src');
		video.load();
		URL.revokeObjectURL(url);
	}
}

/**
 * Settle once the element holds a frame to draw — `loadeddata` is exactly that
 * promise (readyState `HAVE_CURRENT_DATA`), and is the earliest point drawing is
 * defined. A file the browser has no codec for fails on `error` rather than hanging,
 * and the timeout is for the third case: a decode that neither lands nor errors.
 */
function firstFrame(video: HTMLVideoElement): Promise<void> {
	return new Promise((resolve, reject) => {
		const timer = setTimeout(() => {
			cleanup();
			reject(new Error('That video took too long to decode'));
		}, DECODE_TIMEOUT_MS);
		const cleanup = () => {
			clearTimeout(timer);
			video.removeEventListener('loadeddata', onLoaded);
			video.removeEventListener('error', onError);
		};
		const onLoaded = () => {
			cleanup();
			resolve();
		};
		const onError = () => {
			cleanup();
			reject(new Error('This browser could not decode that video'));
		};
		video.addEventListener('loadeddata', onLoaded);
		video.addEventListener('error', onError);
		if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) onLoaded();
	});
}
