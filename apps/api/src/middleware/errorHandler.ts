import type { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { AppError } from '../lib/errors.js';
import { env } from '../config/env.js';

/** Middleware final: normaliza CUALQUIER error a { error: { code, message } }. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res
      .status(err.statusCode)
      .json({ error: { code: err.code, message: err.message, details: err.details } });
  }

  if (err instanceof ZodError) {
    return res.status(422).json({
      error: { code: 'VALIDATION_ERROR', message: 'Datos invalidos', details: err.errors },
    });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      return res.status(409).json({
        error: { code: 'CONFLICT', message: 'Ya existe un registro con ese valor unico' },
      });
    }
    if (err.code === 'P2025') {
      return res
        .status(404)
        .json({ error: { code: 'NOT_FOUND', message: 'Recurso no encontrado' } });
    }
    if (err.code === 'P2003') {
      return res.status(409).json({
        error: {
          code: 'FK_CONSTRAINT',
          message: 'No se puede completar: existen registros relacionados',
        },
      });
    }
  }

  // JSON malformado en el body (body-parser).
  if (err instanceof SyntaxError && 'body' in (err as object)) {
    return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'JSON malformado en la solicitud' } });
  }

  // Origen rechazado por CORS: es un 403 esperado, no un error de servidor
  // (antes caia al catch-all de abajo como 500 "INTERNAL_ERROR" y ensuciaba
  // los logs como si fuera un bug cada vez que un bot prueba un origen).
  if (err instanceof Error && err.message === 'Origen no permitido por CORS') {
    return res.status(403).json({ error: { code: 'FORBIDDEN', message: err.message } });
  }

  // Errores de subida de archivos (multer).
  const e = err as { name?: string; code?: string; message?: string };
  if (e?.name === 'MulterError') {
    const msg =
      e.code === 'LIMIT_FILE_SIZE' ? 'La imagen supera el tamano maximo permitido' : 'Error al subir el archivo';
    return res.status(400).json({ error: { code: 'UPLOAD_ERROR', message: msg } });
  }
  if (e?.message === 'Solo se permiten imagenes') {
    return res.status(400).json({ error: { code: 'UPLOAD_ERROR', message: e.message } });
  }

  // Error no controlado: NUNCA exponer stack/detalles internos al cliente.
  // eslint-disable-next-line no-console
  console.error('[UNHANDLED ERROR]', err);
  return res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Ocurrio un error interno. Intenta nuevamente mas tarde.',
      ...(env.isProd ? {} : { details: String((err as Error)?.message ?? err) }),
    },
  });
}

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Endpoint no encontrado' } });
}
