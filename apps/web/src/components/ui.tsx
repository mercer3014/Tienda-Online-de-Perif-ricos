import { useState } from 'react';
import clsx from 'clsx';
import { AlertTriangle, PackageSearch } from 'lucide-react';
import { assetUrl } from '../lib/api';

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
