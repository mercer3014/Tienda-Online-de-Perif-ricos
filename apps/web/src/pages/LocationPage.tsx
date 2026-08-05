import { MapPin, MessageSquare } from 'lucide-react';
import { useStoreStatus } from '../hooks/catalog';
import { ErrorState, Spinner } from '../components/ui';
import { usePageMeta } from '../components/Layout';
import { formatWhatsappNumber } from '../lib/format';

const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export default function LocationPage() {
  usePageMeta('Ubicación y horarios');
  const { data, isLoading, isError, refetch } = useStoreStatus();

  if (isLoading)
    return (
      <div className="flex items-center justify-center gap-2 py-20 text-txt-muted">
        <Spinner /> Cargando ubicación…
      </div>
    );
  if (isError || !data) return <ErrorState message="No se pudo cargar la información." onRetry={() => refetch()} />;

  const loc = data.location;
  const todayDow = new Date(data.now).getDay();
  const hasCoords = loc != null && loc.latitude != null && loc.longitude != null;
  // Embed de Google Maps sin API key (el admin solo pega el link de "Compartir";
  // las coordenadas ya llegan resueltas desde el backend). z=16 = zoom de barrio.
  const mapSrc = hasCoords ? `https://maps.google.com/maps?q=${loc!.latitude},${loc!.longitude}&z=16&output=embed` : null;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="font-display text-2xl uppercase tracking-wide text-txt-primary">Dónde estamos</h1>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Columna izquierda: mapa */}
        <div className="card overflow-hidden p-0">
          {mapSrc ? (
            <iframe
              src={mapSrc}
              title="Mapa de ubicación"
              loading="lazy"
              className="h-full min-h-[280px] w-full border-0"
            />
          ) : (
            <div className="flex h-full min-h-[280px] flex-col items-center justify-center gap-2 text-txt-faint">
              <MapPin className="h-8 w-8" />
              <span className="text-sm">Mapa no disponible</span>
            </div>
          )}
        </div>

        {/* Columna derecha: dirección + horarios */}
        <div className="space-y-6">
          {loc && (
            <section className="card p-6">
              <h2 className="font-display text-lg text-neon-purple-bright">{loc.mallName}</h2>
              <p className="mt-1 text-txt-muted">{loc.address}</p>
              <p className="mt-1 text-sm text-txt-faint">
                {[loc.passageNumber, loc.localeNumber].filter(Boolean).join(' · ')}
              </p>
              {loc.googleMapsUrl && (
                <div className="mt-4">
                  <a href={loc.googleMapsUrl} target="_blank" rel="noopener noreferrer" className="btn-primary inline-flex items-center gap-2">
                    <MapPin className="h-4 w-4" /> Abrir en Google Maps
                  </a>
                </div>
              )}
            </section>
          )}

          <section className="card p-6">
            <h2 className="mb-3 font-display text-lg text-neon-purple-bright">Horario de atención</h2>
            <ul className="divide-y divide-base-border">
              {data.hours.map((h) => {
                const isToday = h.dayOfWeek === todayDow;
                const closed = h.isClosed;
                return (
                  <li key={h.dayOfWeek} className={`flex justify-between py-2 ${isToday ? 'text-neon-green' : 'text-txt-muted'}`}>
                    <span className={isToday ? 'font-semibold' : ''}>
                      {DAYS[h.dayOfWeek]} {isToday && '(hoy)'}
                    </span>
                    <span>{closed ? 'Cerrado' : `${h.openTime} – ${h.closeTime}`}</span>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>
      </div>

      <section className="card p-6 text-center">
        <p className="text-txt-muted">Coordina tu pedido por WhatsApp</p>
        <a
          href={`https://wa.me/${data.whatsappNumber.replace(/\D/g, '')}`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-accent mt-3 inline-flex items-center gap-2"
        >
          <MessageSquare className="h-4 w-4" /> Escribir por WhatsApp · {formatWhatsappNumber(data.whatsappNumber)}
        </a>
      </section>
    </div>
  );
}
