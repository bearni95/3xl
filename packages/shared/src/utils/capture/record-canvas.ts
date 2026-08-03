/**
 * A canvas, recorded off the screen it is already drawing on.
 *
 * `captureStream` gives a live `MediaStream` fed by whatever the canvas presents, and
 * `MediaRecorder` muxes that stream into a file — so a recording is exactly what was on
 * screen while it ran, at the rate the page was actually drawing it. Nothing here steps or
 * re-renders anything: the animation being recorded is the one the reader is watching, which
 * is the whole point of recording *this* canvas rather than replaying its inputs into a
 * second one.
 *
 * **Which container comes out is the browser's answer, not ours.** MP4 is what a recording is
 * wanted in — it is the one video file every editor, phone and chat window takes — and every
 * current Safari and Chrome will record it, so it is asked for first and in its most widely
 * playable codec (H.264 baseline before high, since a profile a browser will *record* is not
 * always one everything will *play*). A browser that refuses the whole list of MP4 types is
 * not left with nothing, though: WebM follows, and the {@link CanvasRecording} says which of
 * the two it handed back, so a caller names the file after what is in it rather than after
 * what it hoped for.
 */

/** A finished recording: the bytes, and what they turned out to be. */
export interface CanvasRecording {
	blob: Blob;
	/** The MIME type the recorder actually used. */
	mimeType: string;
	/** File extension for that type, without the dot — `mp4` or `webm`. */
	extension: string;
}

export interface RecordCanvasOptions {
	/** How long to record for, in milliseconds. */
	durationMs: number;
	/** Frames a second asked of the stream. The canvas cannot be recorded faster than it
	 * draws, so this is a ceiling and not a promise. */
	fps?: number;
	/** Bits a second asked of the encoder. */
	videoBitsPerSecond?: number;
}

/**
 * The containers and codecs tried, in the order they are wanted. MP4 first (see the module
 * note), each candidate from the most specific codec string to the bare container, since a
 * browser may support the type while rejecting the profile named beside it.
 */
const MIME_CANDIDATES = [
	'video/mp4;codecs=avc1.42E01E',
	'video/mp4;codecs=avc1.640028',
	'video/mp4;codecs=h264',
	'video/mp4',
	'video/webm;codecs=vp9',
	'video/webm;codecs=vp8',
	'video/webm'
];

const DEFAULT_FPS = 60;
const DEFAULT_BITRATE = 12_000_000;

/** The first type on {@link MIME_CANDIDATES} this browser will record, or null if it will
 * record none of them (or has no `MediaRecorder` at all). */
export function supportedRecordingMimeType(): string | null {
	if (typeof MediaRecorder === 'undefined') return null;
	return MIME_CANDIDATES.find((type) => MediaRecorder.isTypeSupported(type)) ?? null;
}

/** `mp4` or `webm`, read off the type the recorder settled on. */
function extensionFor(mimeType: string): string {
	return mimeType.startsWith('video/mp4') ? 'mp4' : 'webm';
}

/** Record `canvas` for `durationMs` and return the file that comes out. */
export async function recordCanvas(
	canvas: HTMLCanvasElement,
	{ durationMs, fps = DEFAULT_FPS, videoBitsPerSecond = DEFAULT_BITRATE }: RecordCanvasOptions
): Promise<CanvasRecording> {
	const mimeType = supportedRecordingMimeType();
	if (!mimeType) throw new Error('This browser cannot record a canvas to video.');

	const stream = canvas.captureStream(fps);
	const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond });
	const chunks: Blob[] = [];
	recorder.addEventListener('dataavailable', (event) => {
		if (event.data.size > 0) chunks.push(event.data);
	});

	// The last chunk arrives *after* stop() returns, so what is waited on is the recorder
	// saying it is finished — not the timer, and not stop() itself.
	const finished = new Promise<void>((resolve, reject) => {
		recorder.addEventListener('stop', () => resolve());
		recorder.addEventListener('error', () =>
			reject(new Error('The browser stopped recording the canvas.'))
		);
	});

	try {
		recorder.start();
		await new Promise<void>((resolve) => setTimeout(resolve, durationMs));
		if (recorder.state !== 'inactive') recorder.stop();
		await finished;
	} finally {
		// The stream keeps drawing off the canvas until its track is stopped, whether the
		// recording ended or threw.
		for (const track of stream.getTracks()) track.stop();
	}

	const blob = new Blob(chunks, { type: mimeType });
	if (blob.size === 0) throw new Error('The recording came out empty.');
	return { blob, mimeType, extension: extensionFor(mimeType) };
}
