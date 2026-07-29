/**
 * Re-state a CSS colour at a given alpha.
 *
 * The colours the charts paint with are read off the live DaisyUI theme with
 * `getComputedStyle`, so their serialised form is whatever the browser chose:
 * modern space-separated functions (`oklch(0.7 0.2 250)`, what a DaisyUI 5 theme
 * gives) take a `/ <alpha>` suffix, while the legacy comma form Chrome still
 * serialises plain colours as (`rgb(255, 0, 0)`) needs `rgba(…, a)` instead —
 * a slash inside a comma-separated list is not valid CSS. Anything else (a
 * keyword, a hex) is handed back untouched rather than mangled.
 */
export function withAlpha(color: string, alpha: number): string {
	const trimmed = color.trim();
	const open = trimmed.indexOf('(');
	if (!trimmed.endsWith(')') || open === -1) return trimmed;

	const fn = trimmed.slice(0, open);
	// Drop an alpha the colour already carries, so this never stacks two.
	const body = trimmed.slice(open + 1, -1).split('/')[0].trim();

	if (body.includes(',')) {
		const channels = body
			.split(',')
			.slice(0, 3)
			.map((channel) => channel.trim());
		const base = fn === 'rgba' ? 'rgb' : fn === 'hsla' ? 'hsl' : fn;
		return `${base}a(${channels.join(', ')}, ${alpha})`;
	}

	return `${fn}(${body} / ${alpha})`;
}
