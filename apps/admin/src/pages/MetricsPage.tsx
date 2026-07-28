import { useMetrics } from '../hooks/admin';
import { ErrorState, PageLoader, StockPill } from '../components/shared';

export default function MetricsPage() {
  const { data, isLoading, isError, refetch } = useMetrics();

  if (isError) return <ErrorState message="No se pudieron cargar las métricas." onRetry={() => refetch()} />;
  if (isLoading || !data) return <PageLoader />;

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl tracking-wide text-txt-primary">Métricas</h1>

      <div className="grid gap-4 lg:grid-cols-3">
        <RankCard title="Más vistos" rows={data.mostViewed} unit="vistas" />
        <RankCard title="Más agregados al carrito" rows={data.mostAddedToCart} unit="veces" />
        <RankCard title="Más pedidos" rows={data.mostOrdered} unit="uds" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-4">
          <h2 className="mb-3 font-display text-sm uppercase tracking-wide text-neon-purple-bright">Alertas de stock</h2>
          {data.lowStock.length === 0 ? (
            <p className="text-sm text-txt-muted">Sin alertas. Todo el stock está saludable.</p>
          ) : (
            <ul className="space-y-2">
              {data.lowStock.map((v) => (
                <li key={v.variantId} className="flex items-center justify-between text-sm">
                  <span className="min-w-0 truncate text-txt-primary">
                    {v.productName} <span className="text-xs text-txt-faint">({v.sku})</span>
                  </span>
                  <StockPill status={v.stockQuantity <= 0 ? 'agotado' : 'pocas_unidades'} />
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card p-4">
          <h2 className="mb-3 font-display text-sm uppercase tracking-wide text-neon-purple-bright">Abandono de carrito</h2>
          <div className="flex items-end gap-6">
            <div>
              <p className="font-display text-3xl font-bold text-neon-green">{data.cartAbandonment.addToCart}</p>
              <p className="text-xs text-txt-muted">agregados al carrito</p>
            </div>
            <div>
              <p className="font-display text-3xl font-bold text-neon-purple-bright">{data.cartAbandonment.whatsappClick}</p>
              <p className="text-xs text-txt-muted">clics a WhatsApp</p>
            </div>
            <div>
              <p className="font-display text-3xl font-bold text-status-low">{Math.round(data.cartAbandonment.rate * 100)}%</p>
              <p className="text-xs text-txt-muted">tasa de abandono</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function RankCard({ title, rows, unit }: { title: string; rows: { productId: string; name: string; count: number }[]; unit: string }) {
  return (
    <div className="card p-4">
      <h2 className="mb-3 font-display text-sm uppercase tracking-wide text-neon-purple-bright">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-txt-muted">Sin datos aún.</p>
      ) : (
        <ol className="space-y-2">
          {rows.map((r, i) => (
            <li key={r.productId} className="flex items-center gap-2 text-sm">
              <span className="font-display text-txt-faint">{i + 1}.</span>
              <span className="min-w-0 flex-1 truncate text-txt-primary">{r.name}</span>
              <span className="text-neon-green">{r.count} {unit}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
