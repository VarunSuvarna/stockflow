// Express 4 does not catch rejected promises in async handlers.
// Wrapping each handler forwards errors to the error middleware.
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
