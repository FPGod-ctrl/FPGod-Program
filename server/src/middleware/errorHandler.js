import { HttpError } from '../utils/httpError.js';

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  const status = err instanceof HttpError ? err.status : err.status || 500;

  if (status >= 500) {
    // eslint-disable-next-line no-console
    console.error('[error]', err.stack || err.message);
  }

  res.status(status).json({
    error: {
      message: err.message || 'Internal server error',
      ...(err.details ? { details: err.details } : {}),
    },
  });
}

export function notFoundHandler(req, res) {
  res.status(404).json({ error: { message: `Route not found: ${req.method} ${req.path}` } });
}
