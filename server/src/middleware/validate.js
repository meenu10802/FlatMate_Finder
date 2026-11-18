import { z } from 'zod';
import { HttpError } from './errorHandler.js';

/**
 * Usage: validate({ body: schema, query: schema, params: schema })
 * Parsed body/params replace req.body/req.params; parsed query goes to req.validatedQuery
 * (req.query is read-only in Express 5).
 */
export const validate = (schemas) => (req, res, next) => {
  for (const [part, schema] of Object.entries(schemas)) {
    const result = schema.safeParse(req[part] ?? {});
    if (!result.success) {
      return next(new HttpError(400, 'VALIDATION_ERROR', 'Invalid request', z.flattenError(result.error)));
    }
    if (part === 'query') req.validatedQuery = result.data;
    else req[part] = result.data;
  }
  next();
};
