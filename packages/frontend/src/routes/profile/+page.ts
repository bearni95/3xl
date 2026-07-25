// Auth runs entirely in the browser (localStorage session, magic-link URL
// handling), so this page is client-rendered only and never prerendered.
export const ssr = false;
export const prerender = false;
