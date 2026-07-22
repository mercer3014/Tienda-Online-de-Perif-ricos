import { useState } from 'react';
import clsx from 'clsx';
import { ImageOff } from 'lucide-react';
import type { StockStatus } from '@villano/shared-types';
import { STOCK_STATUS_LABEL } from '@villano/shared-types';
import { assetUrl } from '../lib/api';

export { Spinner, Skeleton, ErrorState, EmptyState, PageLoader, Modal, Toaster, Field } from './ui';
export { ConfirmDialog } from './ConfirmDialog';

export function StockPill({ status }: { status: StockStatus }) {
  const color =
    status === 'en_stock'
      ? 'text-status-stock border-status-stock/50 bg-status-stock/10'
      : status === 'pocas_unidades'
        ? 'text-status-low border-status-low/50 bg-status-low/10'
        : 'text-status-out border-status-out/50 bg-status-out/10';
  return (
    <span className={clsx('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold', color)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
      {STOCK_STATUS_LABEL[status]}
    </span>
  );
}

/** Boton de accion con solo icono: tooltip (title) + aria-label obligatorios. */
export function ActionIcon({
  icon: Icon,
  label,
  onClick,
  danger,
  disabled,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      disabled={disabled}
      className={clsx(
        'inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors disabled:opacity-40',
        danger ? 'text-status-out hover:bg-status-out/12' : 'text-neon-purple-bright hover:bg-neon-purple/12',
      )}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

/** Miniatura cuadrada de producto con placeholder neutro si no hay imagen. */
export function Thumb({ url, alt, size = 44 }: { url: string | null | undefined; alt: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  const style = { width: size, height: size };
  if (!url || failed) {
    return (
      <div
        className="flex items-center justify-center rounded-md border border-base-border bg-base-void text-txt-faint"
        style={style}
        aria-label={alt}
      >
        <ImageOff className="h-4 w-4" />
      </div>
    );
  }
  return (
    <img
      src={assetUrl(url)}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      className="rounded-md border border-base-border object-cover"
      style={style}
    />
  );
}
