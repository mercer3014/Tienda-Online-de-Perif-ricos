const COORDS_IN_PATH = /@(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)/;
const COORDS_IN_QUERY = /[?&]q=(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)/;

function extractCoords(url: string): { latitude: number; longitude: number } | null {
  const inPath = url.match(COORDS_IN_PATH);
  if (inPath) return { latitude: Number(inPath[1]), longitude: Number(inPath[2]) };
  const inQuery = url.match(COORDS_IN_QUERY);
  if (inQuery) return { latitude: Number(inQuery[1]), longitude: Number(inQuery[2]) };
  return null;
}

/**
 * El admin pega cualquier link "Compartir" de Google Maps -no sabe (ni tiene
 * por que saber) que es latitud/longitud-. La mayoria de esos links YA traen
 * las coordenadas en la URL (?q=lat,long o /@lat,long,zoom); los que son un
 * link corto (maps.app.goo.gl, goo.gl/maps) no las traen hasta seguir el
 * redirect, asi que se resuelve server-side (el navegador del admin no puede
 * por CORS). Si no se puede resolver, se devuelve null y el mapa simplemente
 * no se muestra en el sitio publico (no bloquea el resto del guardado).
 */
export async function resolveGoogleMapsCoords(rawUrl: string): Promise<{ latitude: number; longitude: number } | null> {
  const direct = extractCoords(rawUrl);
  if (direct) return direct;

  try {
    const res = await fetch(rawUrl, { redirect: 'follow', signal: AbortSignal.timeout(5000) });
    return extractCoords(res.url);
  } catch {
    return null;
  }
}
