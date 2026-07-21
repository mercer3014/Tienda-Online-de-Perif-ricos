import { useState } from 'react';
import { OrderStatus, ORDER_STATUS_LABEL, type OrderStatus as OrderStatusT } from '@villano/shared-types';
import { useOrders, useOrderStatusMutation } from '../hooks/admin';
import { useAuth } from '../store/auth';
import { formatBs, formatDateTime } from '../lib/format';
import { toast } from '../lib/toast';
import { EmptyState, ErrorState, PageLoader } from '../components/shared';

const STATUSES = OrderStatus.options;
const statusColor: Record<OrderStatusT, string> = {
  pendiente: 'text-status-low',
  coordinado: 'text-neon-purple-bright',
  completado: 'text-status-stock',
  cancelado: 'text-status-out',
};

export default function OrdersPage() {
  const { can } = useAuth();
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<string | null>(null);
  const query = `page=${page}&pageSize=15${filter ? `&status=${filter}` : ''}`;
  const { data, isLoading, isError, refetch } = useOrders(query);
  const changeStatus = useOrderStatusMutation();

  const setStatus = (id: string, status: OrderStatusT) =>
    changeStatus.mutate({ id, status }, {
      onSuccess: () => toast.success('Estado actualizado'),
      onError: (e) => toast.error(e instanceof Error ? e.message : 'Error'),
    });

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl uppercase tracking-wide text-txt-primary">Pedidos</h1>
        <select className="input max-w-48" value={filter} onChange={(e) => { setFilter(e.target.value); setPage(1); }}>
          <option value="">Todos los estados</option>
          {STATUSES.map((s) => <option key={s} value={s}>{ORDER_STATUS_LABEL[s]}</option>)}
        </select>
      </div>

      {isError ? <ErrorState message="No se pudieron cargar los pedidos." onRetry={() => refetch()} />
        : isLoading ? <PageLoader />
        : data && data.items.length === 0 ? <EmptyState title="Sin pedidos" hint="Aun no hay pedidos generados." />
        : (
          <>
            <div className="space-y-2">
              {data?.items.map((o) => (
                <div key={o.id} className="card p-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <button className="font-mono text-sm text-neon-purple-bright hover:underline" onClick={() => setExpanded(expanded === o.id ? null : o.id)}>
                      {o.orderNumber}
                    </button>
                    <span className="text-xs text-txt-faint">{formatDateTime(o.createdAt)}</span>
                    {o.customerPhone && <span className="text-xs text-txt-muted">📞 {o.customerPhone}</span>}
                    <span className="ml-auto font-display font-bold text-neon-green">{formatBs(o.totalAmount)}</span>
                    {can('cambiar_estado_pedido') ? (
                      <select className={`input w-36 py-1 text-sm ${statusColor[o.status]}`} value={o.status} onChange={(e) => setStatus(o.id, e.target.value as OrderStatusT)}>
                        {STATUSES.map((s) => <option key={s} value={s}>{ORDER_STATUS_LABEL[s]}</option>)}
                      </select>
                    ) : (
                      <span className={`text-sm font-semibold ${statusColor[o.status]}`}>{ORDER_STATUS_LABEL[o.status]}</span>
                    )}
                  </div>
                  {expanded === o.id && (
                    <div className="mt-3 border-t border-base-border pt-3 text-sm">
                      {o.items.map((it) => (
                        <div key={it.id} className="flex justify-between py-1 text-txt-muted">
                          <span>{it.quantity} × {it.productName}{it.variantLabel && ` (${it.variantLabel})`}</span>
                          <span>{formatBs(it.subtotal)}</span>
                        </div>
                      ))}
                      <p className="mt-1 text-xs text-txt-faint">WhatsApp enviado: {o.whatsappSent ? 'Si' : 'No'}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
            {data && data.totalPages > 1 && (
              <div className="mt-4 flex items-center justify-center gap-3 text-sm">
                <button className="btn-primary py-1.5" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>← Anterior</button>
                <span className="text-txt-muted">Pagina {data.page} de {data.totalPages}</span>
                <button className="btn-primary py-1.5" disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)}>Siguiente →</button>
              </div>
            )}
          </>
        )}
    </div>
  );
}
