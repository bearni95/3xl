// The card route reads runtime query params and renders a WebGL card into a GIF,
// so it is purely client-side: no SSR, and nothing to prerender (the static
// adapter serves it via the SPA fallback).
export const ssr = false;
export const prerender = false;
