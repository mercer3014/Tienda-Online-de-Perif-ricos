import { useState } from 'react';
import clsx from 'clsx';
import { ChevronLeft, ChevronRight, ImageOff } from 'lucide-react';
import type { StockStatus } from '@villano/shared-types';
import { STOCK_STATUS_LABEL } from '@villano/shared-types';
import { assetUrl } from '../lib/api';

export { Spinner, Skeleton, ErrorState, EmptyState, PageLoader, Modal, Toaster, Field } from './ui';
export { ConfirmDialog } from './ConfirmDialog';

export function StockPill({ status }: { status: StockStatus }) {
  const badgeClass =
    status === 'en_stock' ? 'badge-success' : status === 'pocas_unidades' ? 'badge-warning' : 'badge-danger';
  return <span className={clsx('badge', badgeClass)}>{STOCK_STATUS_LABEL[status]}</span>;
}

/** Control de paginacion compartido (Anterior/Siguiente). No se renderiza si hay una sola pagina. */
export function Pagination({
  page,
  totalPages,
  onPrev,
  onNext,
}: {
  page: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="mt-4 flex items-center justify-center gap-3 text-sm">
      <button className="btn-secondary py-1.5 inline-flex items-center gap-1" disabled={page <= 1} onClick={onPrev}>
        <ChevronLeft className="h-4 w-4" /> Anterior
      </button>
      <span className="text-txt-muted">Página {page} de {totalPages}</span>
      <button className="btn-secondary py-1.5 inline-flex items-center gap-1" disabled={page >= totalPages} onClick={onNext}>
        Siguiente <ChevronRight className="h-4 w-4" />
      </button>
    </div>
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
    <div className="flex items-center justify-center overflow-hidden rounded-md border border-base-border bg-shot p-1" style={style}>
      <img
        src={assetUrl(url)}
        alt={alt}
        loading="lazy"
        onError={() => setFailed(true)}
        className="h-full w-full object-contain"
      />
    </div>
  );
}
