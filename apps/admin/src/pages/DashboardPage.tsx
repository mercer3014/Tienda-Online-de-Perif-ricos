import { Link } from 'react-router-dom';
import { Eye, ShoppingBag, AlertTriangle, TrendingDown, Package, ListOrdered } from 'lucide-react';
import { useAuth } from '../store/auth';
import { useMetrics } from '../hooks/admin';
import { PageLoader } from '../components/shared';

export default function DashboardPage() {
  const { user, can } = useAuth();
  const showMetrics = can('ver_metricas');
  const { data, isLoading } = useMetrics();

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
      <p className={`mt-2 truncate font-display text-xl font-bold ${tone === 'warn' ? 'text-status-low' : 'text-neon-green'}`}>{value}</p>
      <p className="mt-0.5 text-xs text-txt-muted">{sub}</p>
    </div>
  );
}
