import { useState } from 'react';
import { Download, Phone } from 'lucide-react';
import { OrderStatus, ORDER_STATUS_LABEL, type OrderStatus as OrderStatusT, type OrderDTO } from '@villano/shared-types';
import { useOrders, useOrderStatusMutation } from '../hooks/admin';
import { useAuth } from '../store/auth';
import { apiDownload } from '../lib/api';
import { formatBs, formatDateTime } from '../lib/format';
import { toast } from '../lib/toast';
import { confirmAction } from '../lib/confirm';
import { EmptyState, ErrorState, PageLoader, Pagination } from '../components/shared';

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
  const [nonce, setNonce] = useState(0); // fuerza reset del select si se cancela
  const [exporting, setExporting] = useState(false);
  const query = `page=${page}&pageSize=15${filter ? `&status=${filter}` : ''}`;
  const { data, isLoading, isError, refetch } = useOrders(query);
  const changeStatus = useOrderStatusMutation();

  const exportCsv = async () => {
    setExporting(true);
    try {
      await apiDownload(`/admin/orders/export${filter ? `?status=${filter}` : ''}`, 'pedidos.csv');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo exportar');
    } finally {
      setExporting(false);
    }
  };

  const setStatus = async (o: OrderDTO, status: OrderStatusT) => {
    if (status === o.status) return;
    const ok = await confirmAction({
      title: `¿Cambiar el estado del pedido ${o.orderNumber}?`,
      description: `${ORDER_STATUS_LABEL[o.status]} → ${ORDER_STATUS_LABEL[status]}.`,
      confirmLabel: 'Cambiar estado',
    });
    if (!ok) { setNonce((n) => n + 1); return; }
    changeStatus.mutate({ id: o.id, status }, {
      onSuccess: () => toast.success('Estado actualizado'),
      onError: (e) => toast.error(e instanceof Error ? e.message : 'Error'),
    });
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl tracking-wide text-txt-primary">Pedidos</h1>
        <div className="flex items-center gap-2">
          <select className="input max-w-48" value={filter} onChange={(e) => { setFilter(e.target.value); setPage(1); }}>
            <option value="">Todos los estados</option>
            {STATUSES.map((s) => <option key={s} value={s}>{ORDER_STATUS_LABEL[s]}</option>)}
          </select>
          <button className="btn-secondary inline-flex items-center gap-1.5 whitespace-nowrap" onClick={exportCsv} disabled={exporting}>
            <Download className="h-4 w-4" /> Exportar CSV
          </button>
        </div>
      </div>

      {isError ? <ErrorState message="No se pudieron cargar los pedidos." onRetry={() => refetch()} />
        : isLoading ? <PageLoader />
        : data && data.items.length === 0 ? <EmptyState title="Sin pedidos" hint="Aún no hay pedidos generados." />
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
                    {o.customerPhone && <span className="inline-flex items-center gap-1 text-xs text-txt-muted"><Phone className="h-3 w-3" /> {o.customerPhone}</span>}
                    <span className="ml-auto font-display font-bold text-neon-green">{formatBs(o.totalAmount)}</span>
                    {can('cambiar_estado_pedido') ? (
                      <select key={`${o.status}-${nonce}`} className={`input w-36 py-1 text-sm ${statusColor[o.status]}`} value={o.status} onChange={(e) => setStatus(o, e.target.value as OrderStatusT)}>
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
                      <p className="mt-1 text-xs text-txt-faint">WhatsApp enviado: {o.whatsappSent ? 'Sí' : 'No'}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
            {data && (
              <Pagination page={data.page} totalPages={data.totalPages} onPrev={() => setPage((p) => p - 1)} onNext={() => setPage((p) => p + 1)} />
            )}
          </>
        )}
    </div>
  );
}
