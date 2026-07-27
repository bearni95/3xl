import type { Application } from 'pixi.js';

/**
 * Capture a Pixi Application's live WebGL context and return a disposer that
 * force-loses it.
 *
 * Browsers cap the number of simultaneous WebGL contexts per origin (~16). A
 * destroyed Pixi `Application` frees its canvas, but the underlying GL context is
 * only reclaimed on GC — so surfaces that are created and torn down repeatedly
 * (the team lineup remounting on every team switch, a dev session's HMR reloads)
 * accumulate orphaned contexts until the browser force-loses the *oldest live*
 * one. That victim canvas then goes blank and its render loop throws every frame.
 *
 * Calling `loseContext()` on teardown reclaims the context immediately, keeping
 * the count low. Capture the disposer *before* `app.destroy()` (which tears down
 * the renderer), then invoke it *after*, so destroy still runs against a valid
 * context and the context is freed once it is done. No-op for a WebGPU renderer.
 */
export function captureGlContextDisposer(app: Application): () => void {
	const gl = (app.renderer as unknown as { gl?: WebGLRenderingContext | WebGL2RenderingContext })
		.gl;
	return () => gl?.getExtension('WEBGL_lose_context')?.loseContext();
}
