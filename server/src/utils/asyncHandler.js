/**
 * Wraps an async route handler so rejected promises flow to Express'
 * error middleware instead of crashing the process.
 * @param {import('express').RequestHandler} fn
 * @returns {import('express').RequestHandler}
 */
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

export default asyncHandler;
