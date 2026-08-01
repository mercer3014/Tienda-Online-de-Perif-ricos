import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env.js';

/**
 * Guarda/borra las imagenes de producto (webp ya procesado por Sharp).
 * - Si SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY estan configurados, usa
 *   Supabase Storage (necesario en Render: el disco no es persistente entre
 *   deploys/reinicios).
 * - Si no, usa el disco local bajo uploads/products (comportamiento de
 *   siempre para desarrollo local).
 */
const supabase =
  env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY
    ? createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
    : null;

const LOCAL_DIR = path.join(env.uploadDirAbs, 'products');

export async function saveProductImage(fileName: string, buffer: Buffer): Promise<string> {
  if (supabase) {
    const { error } = await supabase.storage
      .from(env.SUPABASE_STORAGE_BUCKET)
      .upload(fileName, buffer, { contentType: 'image/webp', upsert: true });
    if (error) throw new Error(`No se pudo subir la imagen a Supabase Storage: ${error.message}`);
    return supabase.storage.from(env.SUPABASE_STORAGE_BUCKET).getPublicUrl(fileName).data.publicUrl;
  }

  await mkdir(LOCAL_DIR, { recursive: true });
  await writeFile(path.join(LOCAL_DIR, fileName), buffer);
  return `/uploads/products/${fileName}`;
}

/** Recibe la URL guardada en la DB (relativa o absoluta) y borra el archivo real. */
export async function deleteProductImage(urlWebp: string): Promise<void> {
  const fileName = path.basename(urlWebp);
  if (supabase) {
    await supabase.storage.from(env.SUPABASE_STORAGE_BUCKET).remove([fileName]).catch(() => undefined);
    return;
  }
  if (urlWebp.startsWith('/uploads/products/')) {
    await unlink(path.join(LOCAL_DIR, fileName)).catch(() => undefined);
  }
}
