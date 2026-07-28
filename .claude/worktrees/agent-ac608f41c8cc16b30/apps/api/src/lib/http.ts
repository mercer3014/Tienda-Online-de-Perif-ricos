import type { NextFunction, Request, Response } from 'express';

/** Envuelve un handler async y reenvia errores al middleware central. */
export const asyncHandler =
  <T = unknown>(fn: (req: Request, res: Response, next: NextFunction) => Promise<T>) =>
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

export const ok = <T>(res: Response, data: T, status = 200) => res.status(status).json({ data });
