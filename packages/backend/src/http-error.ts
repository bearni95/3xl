import type { NextFunction, Request, RequestHandler, Response } from 'express';

/** An Error carrying an HTTP status code for the central error handler. */
export interface HttpError extends Error {
	status: number;
}

/** Throw an error the error middleware renders as `{ message }` with `status`. */
export function httpError(status: number, message: string): never {
	throw Object.assign(new Error(message), { status });
}

/**
 * Wrap an async route handler so a rejected promise is forwarded to Express's
 * error middleware instead of crashing the process (works on Express 4 and 5).
 */
export function asyncHandler(
	fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
): RequestHandler {
	return (req, res, next) => {
		fn(req, res, next).catch(next);
	};
}
