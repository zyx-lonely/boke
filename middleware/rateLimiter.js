class RateLimiter {
  constructor(windowMs = 15 * 60 * 1000, maxRequests = 100) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
    this.clients = new Map();
    this._timer = setInterval(() => {
      const now = Date.now();
      for (const [key, data] of this.clients) {
        if (now - data.windowStart > this.windowMs) {
          this.clients.delete(key);
        }
      }
    }, 60000);
  }

  destroy() {
    clearInterval(this._timer);
    this.clients.clear();
  }

  getClientKey(req) {
    return req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || '';
  }

  middleware() {
    return (req, res, next) => {
      const key = this.getClientKey(req);
      const now = Date.now();

      let clientData = this.clients.get(key);

      if (!clientData || now - clientData.windowStart > this.windowMs) {
        clientData = { count: 1, windowStart: now };
        this.clients.set(key, clientData);
        return next();
      }

      clientData.count++;

      if (clientData.count > this.maxRequests) {
        const retryAfter = Math.ceil((clientData.windowStart + this.windowMs - now) / 1000);
        res.setHeader('Retry-After', retryAfter);
        res.setHeader('X-RateLimit-Limit', this.maxRequests);
        res.setHeader('X-RateLimit-Remaining', 0);
        res.setHeader('X-RateLimit-Reset', new Date(clientData.windowStart + this.windowMs).toISOString());
        return res.status(429).json({
          message: '请求过于频繁，请稍后再试',
          retryAfter
        });
      }

      res.setHeader('X-RateLimit-Limit', this.maxRequests);
      res.setHeader('X-RateLimit-Remaining', this.maxRequests - clientData.count);
      res.setHeader('X-RateLimit-Reset', new Date(clientData.windowStart + this.windowMs).toISOString());

      next();
    };
  }

  strict() {
    return this;
  }
}

module.exports = RateLimiter;
