import { ZodError } from 'zod';

export function notFound(req, res) {
  res.status(404).json({ error: 'Not found' });
}

// Central error handler: turns known errors into clean JSON responses.
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  // Zod validation errors -> 400 with per-field messages
  if (err instanceof ZodError) {
    return res
      .status(400)
      .json({ error: 'Validation failed', details: err.flatten().fieldErrors });
  }

  // Malformed JSON body
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  // Prisma unique-constraint violation
  if (err?.code === 'P2002') {
    const target = [].concat(err.meta?.target ?? []).join(',');
    if (target.includes('sku')) {
      return res.status(409).json({
        error: 'SKU already exists in your organization',
        details: { sku: ['SKU already exists'] },
      });
    }
    if (target.includes('email')) {
      return res.status(409).json({
        error: 'Email already registered',
        details: { email: ['Email already registered'] },
      });
    }
    return res.status(409).json({ error: 'Already exists' });
  }

  console.error(err);
  res.status(500).json({ error: 'Something went wrong' });
}
