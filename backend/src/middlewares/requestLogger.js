import crypto from 'crypto';

export function requestLogger(req, res, next) {
  const start = Date.now();
  const requestId = crypto.randomUUID();
  req.requestId = requestId;
  res.setHeader('x-request-id', requestId);

  res.on('finish', () => {
    const payload = {
      level: 'info',
      requestId,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: Date.now() - start,
      timestamp: new Date().toISOString()
    };
    console.log(JSON.stringify(payload));
  });

  next();
}
