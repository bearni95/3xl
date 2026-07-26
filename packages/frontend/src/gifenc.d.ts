/**
 * Minimal ambient types for `gifenc` (v1.0.3), which ships no `.d.ts`. Only the
 * three entry points the card GIF exporter uses are declared.
 */
declare module 'gifenc' {
	type RGBPalette = number[][];
	type PixelData = Uint8Array | Uint8ClampedArray;

	export function quantize(
		data: PixelData,
		maxColors: number,
		options?: { format?: 'rgb565' | 'rgb444' | 'rgba4444'; oneBitAlpha?: boolean | number; clearAlpha?: boolean }
	): RGBPalette;

	export function applyPalette(
		data: PixelData,
		palette: RGBPalette,
		format?: 'rgb565' | 'rgb444' | 'rgba4444'
	): Uint8Array;

	export interface GifWriteFrameOptions {
		palette?: RGBPalette;
		/** Frame delay in milliseconds. */
		delay?: number;
		transparent?: boolean;
		transparentIndex?: number;
		/** Loop count; 0 = loop forever. */
		repeat?: number;
		dispose?: number;
		first?: boolean;
	}

	export interface GifEncoderStream {
		writeFrame(index: Uint8Array, width: number, height: number, options?: GifWriteFrameOptions): void;
		finish(): void;
		bytes(): Uint8Array;
		readonly buffer: ArrayBuffer;
	}

	export function GIFEncoder(options?: { auto?: boolean; initialCapacity?: number }): GifEncoderStream;
}
