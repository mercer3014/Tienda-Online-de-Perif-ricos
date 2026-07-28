import { MapPin, Navigation, MessageSquare } from 'lucide-react';
import { useStoreStatus } from '../hooks/catalog';
import { ErrorState, Spinner } from '../components/ui';
import { usePageMeta, StoreStatusPill } from '../components/Layout';

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

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl uppercase tracking-wide text-txt-primary">Dónde estamos</h1>
        <StoreStatusPill />
      </div>

      {loc && (
        <section className="card p-6">
          <h2 className="font-display text-lg text-neon-purple-bright">{loc.mallName}</h2>
          <p className="mt-1 text-txt-muted">{loc.address}</p>
          <p className="mt-1 text-sm text-txt-faint">
            {[loc.passageNumber, loc.localeNumber].filter(Boolean).join(' · ')}
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            {loc.googleMapsUrl && (
              <a href={loc.googleMapsUrl} target="_blank" rel="noopener noreferrer" className="btn-primary inline-flex items-center gap-2">
                <MapPin className="h-4 w-4" /> Abrir en Google Maps
              </a>
            )}
            {loc.wazeUrl && (
              <a href={loc.wazeUrl} target="_blank" rel="noopener noreferrer" className="btn-accent inline-flex items-center gap-2">
                <Navigation className="h-4 w-4" /> Abrir en Waze
              </a>
            )}
          </div>
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

      <section className="card p-6 text-center">
        <p className="text-txt-muted">Coordina tu pedido por WhatsApp</p>
        <a
          href={`https://wa.me/${data.whatsappNumber.replace(/\D/g, '')}`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-accent mt-3 inline-flex items-center gap-2"
        >
          <MessageSquare className="h-4 w-4" /> Escribir por WhatsApp
        </a>
      </section>
    </div>
  );
}
