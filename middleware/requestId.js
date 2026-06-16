const crypto = require('crypto');

function requestIdMiddleware(req, res, next) {
  let requestId = req.headers['x-request-id'];
  if (!requestId || typeof requestId !== 'string' || requestId.length > 128) {
    requestId = crypto.randomUUID();
  }
  req.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);
  next();
}

module.exports = requestIdMiddleware;
