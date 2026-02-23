export const validate = (schema, source = 'body') => (req, res, next) => {
  const parsed = schema.safeParse(req[source]);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Validation failed', errors: parsed.error.flatten() });
  }
  req[source] = parsed.data;
  next();
};
