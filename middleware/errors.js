function notFound(_req, res, _next) {
  res.status(404).json({ error: 'not_found' });
}

function methodNotAllowed(_req, res, _next) {
  res.status(405).json({ error: 'method_not_allowed' });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, _req, res, _next) {
  const status = err.status && Number.isInteger(err.status) ? err.status : 500;
  if (status >= 500) {
    // minimal logging to stderr; structured logs already capture basics
    // do not leak stack in response
    // console can remain minimal
    // eslint-disable-next-line no-console
    console.error('InternalError', err.message);
  }
  res.status(status).json({ error: status >= 500 ? 'internal_error' : err.message });
}

module.exports = { notFound, methodNotAllowed, errorHandler };
