import { Link } from 'react-router-dom';
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
        <h1 className="font-display text-2xl uppercase tracking-wide text-txt-primary">
          Hola, {user?.name.split(' ')[0]}
        </h1>
        <p className="text-txt-muted">Rol: {user?.role.name}</p>
      </div>

      {showMetrics ? (
        isLoading ? (
          <PageLoader />
        ) : data ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Producto mas visto" value={data.mostViewed[0]?.name ?? '—'} sub={`${data.mostViewed[0]?.count ?? 0} vistas`} />
            <StatCard label="Mas agregado al carrito" value={data.mostAddedToCart[0]?.name ?? '—'} sub={`${data.mostAddedToCart[0]?.count ?? 0} veces`} />
            <StatCard label="Alertas de stock" value={String(data.lowStock.length)} sub="variantes bajo/agotado" tone="warn" />
            <StatCard label="Abandono de carrito" value={`${Math.round(data.cartAbandonment.rate * 100)}%`} sub={`${data.cartAbandonment.addToCart} al carrito`} tone="warn" />
          </div>
        ) : null
      ) : (
        <div className="card p-6 text-txt-muted">
          Usa el menu lateral para gestionar el contenido segun tus permisos.
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        {can('crear_producto') && <Link to="/productos" className="btn-primary">Gestionar productos</Link>}
        {can('ver_pedidos') && <Link to="/pedidos" className="btn-accent">Ver pedidos</Link>}
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, tone }: { label: string; value: string; sub: string; tone?: 'warn' }) {
  return (
    <div className="card p-4">
      <p className="text-xs uppercase tracking-wide text-txt-faint">{label}</p>
      <p className={`mt-1 truncate font-display text-xl font-bold ${tone === 'warn' ? 'text-status-low' : 'text-neon-green'}`}>{value}</p>
      <p className="text-xs text-txt-muted">{sub}</p>
    </div>
  );
}
