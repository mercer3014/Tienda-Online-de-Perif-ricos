import { useState } from 'react';
import clsx from 'clsx';
import { AlertTriangle, CheckCircle2, Info, PackageSearch, XCircle } from 'lucide-react';
import { assetUrl } from '../lib/api';
import { useToast } from '../lib/toast';

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Cargando"
      className={clsx(
        'inline-block animate-spin rounded-full border-2 border-neon-purple/30 border-t-neon-purple',
        className ?? 'h-5 w-5',
      )}
    />
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx('skeleton', className)} aria-hidden />;
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="card mx-auto max-w-md p-8 text-center" role="alert">
      <AlertTriangle className="mx-auto mb-2 h-10 w-10 text-status-out" aria-hidden />
      <p className="mb-4 text-txt-muted">{message}</p>
      {onRetry && (
        <button className="btn-primary" onClick={onRetry}>
          Reintentar
        </button>
      )}
    </div>
  );
}

export function EmptyState({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="card mx-auto max-w-md p-10 text-center">
      <PackageSearch className="mx-auto mb-3 h-12 w-12 text-txt-faint opacity-60" aria-hidden />
      <h3 className="mb-1 text-lg text-txt-primary">{title}</h3>
      {hint && <p className="text-sm text-txt-muted">{hint}</p>}
      {action && (
        <button className="btn-primary mt-4" onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </div>
  );
}

const TOAST_ICON = { success: CheckCircle2, error: XCircle, info: Info } as const;
const TOAST_CIRCLE_CLASS = {
  success: 'bg-status-stock/12 text-status-stock',
  error: 'bg-status-out/12 text-status-out',
  info: 'bg-neon-purple/12 text-neon-purple-bright',
} as const;

/** Notificacion flotante centrada, icono en circulo + texto (mismo lenguaje
 * visual que los dialogos de confirmacion, no una notificacion de esquina). */
export function Toaster() {
  const toasts = useToast((s) => s.toasts);
  const dismiss = useToast((s) => s.dismiss);
  return (
    <div className="pointer-events-none fixed inset-0 z-[100] flex flex-col items-center justify-center gap-3 p-4">
      {toasts.map((t) => {
        const Icon = TOAST_ICON[t.type];
        return (
          <div
            key={t.id}
            onClick={() => dismiss(t.id)}
            role="status"
            className="toast-pop card pointer-events-auto flex w-full max-w-sm cursor-pointer items-start gap-3 p-5"
          >
            <span className={clsx('mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full', TOAST_CIRCLE_CLASS[t.type])}>
              <Icon className="h-5 w-5" />
            </span>
            <p className="min-w-0 flex-1 pt-1.5 text-sm font-medium text-txt-primary">{t.message}</p>
          </div>
        );
      })}
    </div>
  );
}

/** Imagen con lazy loading y fallback si falla la carga. */
export function ProductImg({
  url,
  alt,
  className,
}: {
  url: string | null;
  alt: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (!url || failed) {
    return (
      <div
        className={clsx('flex items-center justify-center bg-base-void text-txt-faint', className)}
        aria-label={alt}
      >
        <span className="font-display text-sm uppercase tracking-widest">Sin imagen</span>
      </div>
    );
  }
  return (
    <img
      src={assetUrl(url)}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
