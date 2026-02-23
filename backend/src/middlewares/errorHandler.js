export function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const safeMessage = statusCode >= 500 ? 'Something went wrong. Please try again.' : err.message || 'Request failed';

  if (process.env.NODE_ENV !== 'production') {
    console.error({
      level: 'error',
      requestId: req?.requestId,
      statusCode,
      message: err?.message,
      stack: err?.stack,
      path: req?.originalUrl
    });
  }

  res.status(statusCode).json({ message: safeMessage, requestId: req?.requestId });
}
