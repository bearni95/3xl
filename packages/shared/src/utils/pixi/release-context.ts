import type { Application, DestroyOptions } from 'pixi.js';

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

/**
 * Tear a Pixi `Application` down without taking any *other* live app with it.
 *
 * **Never call `app.destroy(true, …)`.** That `true` is two instructions in one:
 * remove the canvas, *and* run `GlobalResourceRegistry.release()` — which clears
 * the pools Pixi keeps at module scope and shares across every renderer on the
 * page (the batch pool, `TexturePool`, `CanvasPool`). Releasing them destroys
 * pooled `Batch` objects that another, still-running app holds in its built
 * instruction sets, so from the next frame on that app throws
 * `batcher is null` / `_batch.textures is null` forever — its canvas freezes and
 * the console fills up. Nothing about the destroyed app looks wrong; the victim is
 * always some other canvas. Passing `{ removeView: true }` drops the canvas and
 * leaves the shared pools alone.
 *
 * The WebGL context goes back at the same time (see
 * {@link captureGlContextDisposer}), so repeated build/teardown cycles don't
 * accumulate orphaned contexts.
 *
 * @param stageOptions - how to destroy the stage's children (Pixi's second arg).
 */
export function destroyPixiApp(
	app: Application,
	stageOptions: DestroyOptions = { children: true }
): void {
	const disposeContext = captureGlContextDisposer(app);
	app.destroy({ removeView: true }, stageOptions);
	disposeContext();
}
