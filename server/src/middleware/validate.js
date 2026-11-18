import { HttpError } from './errorHandler.js';

// Usage: validate({ body: schema, query: schema, params: schema })
export const validate = (schemas) => (req, res, next) => {
  for (const [part, schema] of Object.entries(schemas)) {
    const result = schema.safeParse(req[part]);
    if (!result.success) {
      return next(new HttpError(400, 'VALIDATION_ERROR', 'Invalid request', result.error.flatten()));
    }
    if (part === 'query') req.validatedQuery = result.data;
    else req[part] = result.data;
  }
  next();
};
