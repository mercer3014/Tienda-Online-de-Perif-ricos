import { useState } from 'react';
import clsx from 'clsx';
import type { StockStatus } from '@villano/shared-types';
import { STOCK_STATUS_LABEL } from '@villano/shared-types';
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

export function StockBadge({ status, className }: { status: StockStatus; className?: string }) {
  const color =
    status === 'en_stock'
      ? 'text-status-stock border-status-stock/50 bg-status-stock/10'
      : status === 'pocas_unidades'
        ? 'text-status-low border-status-low/50 bg-status-low/10'
        : 'text-status-out border-status-out/50 bg-status-out/10';
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold',
        color,
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
      {STOCK_STATUS_LABEL[status]}
    </span>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="card mx-auto max-w-md p-8 text-center" role="alert">
      <div className="mb-2 text-4xl">⚠️</div>
      <p className="mb-4 text-txt-muted">{message}</p>
      {onRetry && (
        <button className="btn-primary" onClick={onRetry}>
          Reintentar
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="card mx-auto max-w-md p-10 text-center">
      <div className="mb-3 text-5xl opacity-60">🕹️</div>
      <h3 className="mb-1 text-lg text-txt-primary">{title}</h3>
      {hint && <p className="text-sm text-txt-muted">{hint}</p>}
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
