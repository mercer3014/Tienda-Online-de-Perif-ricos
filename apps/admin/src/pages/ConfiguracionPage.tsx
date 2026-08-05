import { useEffect, useState } from 'react';
import { MessageCircle, MapPin, Clock, Megaphone } from 'lucide-react';
import { updateStoreSettingsSchema, type BusinessHourInput } from '@villano/shared-types';
import { useStoreSettings, useUpdateStoreSettings } from '../hooks/admin';
import { MSG_DATOS_INVALIDOS } from '../lib/format';
import { toast } from '../lib/toast';
import { confirmAction } from '../lib/confirm';
import { COUNTRY_CODES, splitWhatsappNumber } from '../lib/countryCodes';
import { ErrorState, Field, PageLoader, Spinner } from '../components/shared';

const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

interface FormState {
  dialCode: string;
  localNumber: string;
  mallName: string;
  address: string;
  passageNumber: string;
  localeNumber: string;
  googleMapsUrl: string;
  announcement: string;
  hours: BusinessHourInput[];
}

const EMPTY_HOURS: BusinessHourInput[] = Array.from({ length: 7 }, (_, dayOfWeek) => ({
  dayOfWeek,
  openTime: '09:00',
  closeTime: '20:00',
  isClosed: false,
}));

const EMPTY_FORM: FormState = {
  dialCode: COUNTRY_CODES[0].dialCode,
  localNumber: '',
  mallName: '',
  address: '',
  passageNumber: '',
  localeNumber: '',
  googleMapsUrl: '',
  announcement: '',
  hours: EMPTY_HOURS,
};

export default function ConfiguracionPage() {
  const { data, isLoading, isError, refetch } = useStoreSettings();
  const { mutateAsync, isPending } = useUpdateStoreSettings();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!data) return;
    const { dialCode, local } = splitWhatsappNumber(data.whatsappNumber);
    setForm({
      dialCode,
      localNumber: local,
      mallName: data.location.mallName,
      address: data.location.address,
      passageNumber: data.location.passageNumber ?? '',
      localeNumber: data.location.localeNumber ?? '',
      googleMapsUrl: data.location.googleMapsUrl ?? '',
      announcement: data.announcement ?? '',
      hours: data.hours,
    });
  }, [data]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));

  const setHour = (dayOfWeek: number, patch: Partial<BusinessHourInput>) =>
    setForm((f) => ({ ...f, hours: f.hours.map((h) => (h.dayOfWeek === dayOfWeek ? { ...h, ...patch } : h)) }));

  const submit = async () => {
    setErr(null);
    const payload = {
      whatsappNumber: `${form.dialCode}${form.localNumber.replace(/\D/g, '')}`,
      mallName: form.mallName,
      address: form.address,
      passageNumber: form.passageNumber.trim() || null,
      localeNumber: form.localeNumber.trim() || null,
      googleMapsUrl: form.googleMapsUrl.trim() || null,
      announcement: form.announcement.trim() || null,
      hours: form.hours,
    };
    const parsed = updateStoreSettingsSchema.safeParse(payload);
    if (!parsed.success) {
      setErr(parsed.error.errors[0]?.message ?? MSG_DATOS_INVALIDOS);
      return;
    }
    const ok = await confirmAction({
      title: '¿Guardar cambios en la configuración?',
      description: 'Se van a actualizar el contacto, la ubicación, los horarios y el anuncio que ve el público en el sitio.',
      confirmLabel: 'Guardar cambios',
    });
    if (!ok) return;
    try {
      await mutateAsync(parsed.data);
      toast.success('Configuración actualizada');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al guardar');
    }
  };

  return (
    <div>
      <h1 className="mb-4 font-display text-2xl tracking-wide text-txt-primary">Configuración</h1>

      {isError ? (
        <ErrorState message="No se pudo cargar la configuración." onRetry={() => refetch()} />
      ) : isLoading ? (
        <PageLoader />
      ) : (
        <div className="max-w-2xl space-y-5">
          {/* WhatsApp */}
          <section className="card p-5">
            <SectionTitle icon={MessageCircle}>Contacto de WhatsApp</SectionTitle>
            <p className="mb-4 text-sm text-txt-muted">
              Número al que llegan los pedidos del carrito y que se muestra en el sitio público. Se puede cambiar en
              cualquier momento sin necesidad de volver a publicar el sistema.
            </p>
            <div className="grid gap-3 sm:grid-cols-[minmax(0,180px)_1fr]">
              <Field label="País">
                <select className="input" value={form.dialCode} onChange={(e) => set('dialCode', e.target.value)}>
                  {COUNTRY_CODES.map((c) => (
                    <option key={c.iso2} value={c.dialCode}>
                      {c.flag} +{c.dialCode} {c.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field
                label="Número (sin código de país)"
                hint={form.localNumber ? `Se guardará como +${form.dialCode} ${form.localNumber.replace(/\D/g, '')}` : 'Solo dígitos, sin espacios'}
              >
                <input
                  className="input"
                  inputMode="numeric"
                  value={form.localNumber}
                  onChange={(e) => set('localNumber', e.target.value)}
                  placeholder="74162758"
                />
              </Field>
            </div>
          </section>

          {/* Ubicacion */}
          <section className="card p-5">
            <SectionTitle icon={MapPin}>Ubicación</SectionTitle>
            <p className="mb-4 text-sm text-txt-muted">
              Se muestra en la página "Dónde estamos" del sitio público, junto con el mapa.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Mall / edificio">
                <input className="input" value={form.mallName} onChange={(e) => set('mallName', e.target.value)} placeholder="Ventura Mall" />
              </Field>
              <Field label="Dirección">
                <input className="input" value={form.address} onChange={(e) => set('address', e.target.value)} placeholder="Av. San Martín, Equipetrol" />
              </Field>
              <Field label="Pasillo">
                <input className="input" value={form.passageNumber} onChange={(e) => set('passageNumber', e.target.value)} placeholder="Pasaje 3" />
              </Field>
              <Field label="Local">
                <input className="input" value={form.localeNumber} onChange={(e) => set('localeNumber', e.target.value)} placeholder="Local 214" />
              </Field>
              <div className="sm:col-span-2">
                <Field
                  label="Link de Google Maps"
                  hint='Abrí Google Maps, buscá la ubicación, tocá "Compartir" y pegá el link acá. El mapa del sitio público se actualiza solo.'
                >
                  <input className="input" value={form.googleMapsUrl} onChange={(e) => set('googleMapsUrl', e.target.value)} placeholder="https://maps.google.com/... o https://maps.app.goo.gl/..." />
                </Field>
              </div>
            </div>
          </section>

          {/* Horarios */}
          <section className="card p-5">
            <SectionTitle icon={Clock}>Horario de atención</SectionTitle>
            <div className="space-y-2">
              {form.hours.map((h) => (
                <div key={h.dayOfWeek} className="flex flex-wrap items-center gap-3 border-b border-base-border/40 py-2 last:border-0">
                  <span className="w-24 shrink-0 text-sm font-medium text-txt-primary">{DAYS[h.dayOfWeek]}</span>
                  <label className="flex items-center gap-1.5 text-xs text-txt-muted">
                    <input
                      type="checkbox"
                      className="accent-neon-green"
                      checked={h.isClosed}
                      onChange={(e) => setHour(h.dayOfWeek, { isClosed: e.target.checked })}
                    />
                    Cerrado
                  </label>
                  {!h.isClosed && (
                    <div className="flex items-center gap-2">
                      <input type="time" className="input py-1.5" value={h.openTime} onChange={(e) => setHour(h.dayOfWeek, { openTime: e.target.value })} />
                      <span className="text-txt-faint">a</span>
                      <input type="time" className="input py-1.5" value={h.closeTime} onChange={(e) => setHour(h.dayOfWeek, { closeTime: e.target.value })} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Comunicado */}
          <section className="card p-5">
            <SectionTitle icon={Megaphone}>Comunicado</SectionTitle>
            <p className="mb-4 text-sm text-txt-muted">
              Mensaje corto opcional para avisos puntuales (feriados, promociones, cambios de horario). Se muestra
              como una franja en el sitio público; dejalo vacío para que no aparezca nada.
            </p>
            <Field label="Mensaje" hint={`${form.announcement.length}/280`}>
              <textarea
                className="input min-h-[70px] resize-y"
                maxLength={280}
                value={form.announcement}
                onChange={(e) => set('announcement', e.target.value)}
                placeholder="Ej: Cerrado el 6 de agosto por feriado"
              />
            </Field>
          </section>

          {err && <p className="rounded bg-status-out/10 px-3 py-2 text-sm text-status-out">{err}</p>}

          <div className="flex justify-end">
            <button className="btn-primary" onClick={submit} disabled={isPending}>
              {isPending ? <Spinner className="h-4 w-4" /> : 'Guardar cambios'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SectionTitle({ icon: Icon, children }: { icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <div className="mb-1 flex items-center gap-2 text-neon-purple-bright">
      <Icon className="h-5 w-5" />
      <h2 className="font-display text-sm tracking-wide">{children}</h2>
    </div>
  );
}
