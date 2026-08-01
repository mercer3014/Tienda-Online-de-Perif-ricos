import { Link } from 'react-router-dom';
import { Eye, ShoppingBag, AlertTriangle, TrendingDown, Package, ListOrdered, ChevronRight } from 'lucide-react';
import type { OrderStatus as OrderStatusT } from '@villano/shared-types';
import { ORDER_STATUS_LABEL } from '@villano/shared-types';
import { useAuth } from '../store/auth';
import { useMetrics, useOrders } from '../hooks/admin';
import { PageLoader, StockPill } from '../components/shared';
import { formatBs, formatDateTime } from '../lib/format';

const statusColor: Record<OrderStatusT, string> = {
  pendiente: 'text-status-low',
  coordinado: 'text-neon-purple-bright',
  completado: 'text-status-stock',
  cancelado: 'text-status-out',
};

export default function DashboardPage() {
  const { user, can } = useAuth();
  const showMetrics = can('ver_metricas');
  const showOrders = can('ver_pedidos');
  const { data, isLoading } = useMetrics();
  const { data: orders } = useOrders('page=1&pageSize=6');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl tracking-wide text-txt-primary">
          Hola, {user?.name.split(' ')[0]}
        </h1>
        <p className="text-txt-muted">Rol: {user?.role.name}</p>
      </div>

      {showMetrics ? (
        isLoading ? (
          <PageLoader />
        ) : data ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard icon={Eye} label="Producto más visto" value={data.mostViewed[0]?.name ?? '—'} sub={`${data.mostViewed[0]?.count ?? 0} vistas`} />
            <StatCard icon={ShoppingBag} label="Más agregado al carrito" value={data.mostAddedToCart[0]?.name ?? '—'} sub={`${data.mostAddedToCart[0]?.count ?? 0} veces`} />
            <StatCard icon={AlertTriangle} label="Alertas de stock" value={String(data.lowStock.length)} sub="variantes bajo/agotado" tone="warn" />
            <StatCard icon={TrendingDown} label="Abandono de carrito" value={`${Math.round(data.cartAbandonment.rate * 100)}%`} sub={`${data.cartAbandonment.addToCart} al carrito`} tone="warn" />
          </div>
        ) : null
      ) : (
        <div className="card p-6 text-txt-muted">
          Usá el menú lateral para gestionar el contenido según tus permisos.
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        {can('crear_producto') && (
          <Link to="/productos" className="btn-primary inline-flex items-center gap-2">
            <Package className="h-4 w-4" /> Gestionar productos
          </Link>
        )}
        {can('ver_pedidos') && (
          <Link to="/pedidos" className="btn-accent inline-flex items-center gap-2">
            <ListOrdered className="h-4 w-4" /> Ver pedidos
          </Link>
        )}
      </div>

      {(showOrders || showMetrics) && (
        <div className="grid gap-4 lg:grid-cols-2">
          {showOrders && (
            <div className="card p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-display text-sm uppercase tracking-wide text-neon-purple-bright">
                  Pedidos recientes
                </h2>
                <Link to="/pedidos" className="inline-flex items-center gap-1 text-xs text-txt-muted hover:text-neon-purple-bright">
                  Ver todos <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>
              {!orders ? (
                <p className="text-sm text-txt-muted">Cargando…</p>
              ) : orders.items.length === 0 ? (
                <p className="text-sm text-txt-muted">Aún no hay pedidos generados.</p>
              ) : (
                <ul className="divide-y divide-base-border">
                  {orders.items.map((o) => (
                    <li key={o.id} className="flex items-center gap-3 py-2 text-sm">
                      <span className="font-mono text-xs text-neon-purple-bright">{o.orderNumber}</span>
                      <span className="min-w-0 flex-1 truncate text-txt-primary">{o.customerName ?? '—'}</span>
                      <span className={`shrink-0 text-xs font-medium ${statusColor[o.status]}`}>
                        {ORDER_STATUS_LABEL[o.status]}
                      </span>
                      <span className="shrink-0 font-display font-semibold text-txt-primary">{formatBs(o.totalAmount)}</span>
                    </li>
                  ))}
                </ul>
              )}
              {orders && orders.items.length > 0 && (
                <p className="mt-2 text-right text-xs text-txt-faint">
                  {formatDateTime(orders.items[0].createdAt)} · último
                </p>
              )}
            </div>
          )}

          {showMetrics && (
            <div className="card p-4">
              <h2 className="mb-3 font-display text-sm uppercase tracking-wide text-neon-purple-bright">
                Alertas de stock
              </h2>
              {!data ? (
                <p className="text-sm text-txt-muted">Cargando…</p>
              ) : data.lowStock.length === 0 ? (
                <p className="text-sm text-txt-muted">Sin alertas. Todo el stock está saludable.</p>
              ) : (
                <ul className="space-y-2">
                  {data.lowStock.map((v) => (
                    <li key={v.variantId} className="flex items-center justify-between gap-3 text-sm">
                      <span className="min-w-0 truncate text-txt-primary">
                        {v.productName} <span className="text-xs text-txt-faint">({v.sku})</span>
                      </span>
                      <StockPill status={v.stockQuantity <= 0 ? 'agotado' : 'pocas_unidades'} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, tone }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; sub: string; tone?: 'warn' }) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between text-txt-faint">
        <p className="text-xs uppercase tracking-wide">{label}</p>
        <Icon className={`h-4 w-4 ${tone === 'warn' ? 'text-status-low' : 'text-neon-purple-bright'}`} />
      </div>
      <p className={`mt-2 truncate font-display text-xl font-bold ${tone === 'warn' ? 'text-status-low' : 'text-txt-primary'}`}>{value}</p>
      <p className="mt-0.5 text-xs text-txt-muted">{sub}</p>
    </div>
  );
}
