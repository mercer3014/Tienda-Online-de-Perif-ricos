import clsx from 'clsx';
import type { StockStatus } from '@villano/shared-types';
import { STOCK_STATUS_LABEL } from '@villano/shared-types';

export { Spinner, Skeleton, ErrorState, EmptyState, PageLoader, Modal, Toaster, Field } from './ui';

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
