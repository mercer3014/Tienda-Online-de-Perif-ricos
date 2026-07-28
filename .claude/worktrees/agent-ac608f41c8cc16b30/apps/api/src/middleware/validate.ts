import type { NextFunction, Request, Response } from 'express';
import type { ZodTypeAny } from 'zod';
import { unprocessable } from '../lib/errors.js';

type Schemas = {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
};

/**
 * Valida body/query/params con Zod antes de tocar la base de datos.
 * Reemplaza el valor por el parseado (con defaults/coerciones aplicados).
 */
export const validate =
  (schemas: Schemas) => (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (schemas.params) req.params = schemas.params.parse(req.params) as typeof req.params;
      if (schemas.query) {
        // req.query es de solo lectura en Express 5; guardamos el parseado aparte.
        (req as { validatedQuery?: unknown }).validatedQuery = schemas.query.parse(req.query);
      }
      if (schemas.body) req.body = schemas.body.parse(req.body);
      next();
    } catch (err) {
      const zerr = err as { errors?: unknown };
      next(unprocessable('Datos invalidos', zerr.errors ?? String(err)));
    }
  };

/** Acceso al query ya validado (con defaults aplicados). */
export const getQuery = <T>(req: Request): T =>
  ((req as { validatedQuery?: unknown }).validatedQuery ?? req.query) as T;
