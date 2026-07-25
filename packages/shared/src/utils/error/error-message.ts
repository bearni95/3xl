/**
 * Extract a human-readable message from an unknown thrown value.
 *
 * Handles plain `Error`s, but also the shapes that are *not* `Error` instances —
 * notably Supabase/PostgREST errors (`{ message, details, hint, code }`), which
 * `String(error)` would render as the useless `[object Object]`.
 */
export function errorMessage(error: unknown): string {
	if (error instanceof Error) return error.message;

	if (error && typeof error === 'object') {
		const record = error as Record<string, unknown>;
		const message = typeof record.message === 'string' ? record.message : '';
		const details = typeof record.details === 'string' ? record.details : '';
		const joined = [message, details].filter(Boolean).join(' — ');
		if (joined) return joined;
		try {
			return JSON.stringify(error);
		} catch {
			/* fall through to String() */
		}
	}

	return String(error);
}
