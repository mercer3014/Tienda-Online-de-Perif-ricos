import { Link } from 'react-router-dom';
import { ArrowRight, ChevronRight, Sparkles } from 'lucide-react';
import { useProducts, useCategoryTree } from '../hooks/catalog';
import { ProductCard, ProductCardSkeleton } from '../components/ProductCard';
import { EmptyState, ErrorState } from '../components/ui';
import { usePageMeta } from '../components/Layout';
import { getCategoryIconComponent } from '../lib/categoryIcons';

export default function HomePage() {
  usePageMeta('', 'Periféricos gamer en Santa Cruz, Bolivia: mouse, teclados mecánicos y componentes. Pedidos por WhatsApp.');
  const { data, isLoading, isError, refetch } = useProducts('pageSize=8&sort=recientes');
  const { data: categories } = useCategoryTree();

  return (
    <div className="space-y-10">
      {/* Hero */}
      <section className="neon-border relative overflow-hidden bg-base-graphite p-8 sm:p-12">
        <div className="pointer-events-none absolute inset-0 bg-grid-neon [background-size:32px_32px] opacity-40" />
        <div className="relative max-w-2xl">
          <h1 className="font-display text-3xl font-bold uppercase leading-tight tracking-wide text-txt-primary sm:text-5xl">
            Sube de <span className="text-neon-purple-bright">nivel</span> tu{' '}
            <span className="text-neon-green">setup</span>
          </h1>
          <p className="mt-3 max-w-lg text-txt-muted">
            Periféricos y componentes gamer en Santa Cruz. Arma tu pedido y coordinamos
            pago y entrega por WhatsApp.
          </p>
          <Link to="/catalogo" className="btn-primary mt-6 inline-flex items-center gap-2">
            Explorar catálogo <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Categorias */}
      {categories && categories.length > 0 && (
        <section>
          <h2 className="mb-4 font-display text-xl uppercase tracking-wide text-txt-primary">Categorías</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {categories.map((c) => {
              const Icon = getCategoryIconComponent(c.icon);
              return (
                <Link
                  key={c.id}
                  to={`/catalogo?categoria=${c.slug}`}
                  className="card group relative flex flex-col items-center gap-2 p-4 text-center transition-all duration-300 hover:-translate-y-1 hover:border-neon-purple/60 hover:shadow-neon-purple active:translate-y-0 active:scale-95"
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-neon-purple/10 text-neon-purple-bright transition-all duration-300 group-hover:scale-110 group-hover:bg-neon-purple/20">
                    <Icon className="h-6 w-6" />
                  </span>
                  <span className="text-sm font-semibold text-txt-primary transition-colors group-hover:text-neon-purple-bright">
                    {c.name}
                  </span>
                  {c.isPromo && c.promoBadgeText && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-neon-green/15 px-2 py-0.5 text-xs font-bold text-neon-green">
                      <Sparkles className="h-3 w-3" /> {c.promoBadgeText}
                    </span>
                  )}
                  <span className="text-xs text-txt-faint">{c.productCount ?? 0} productos</span>
                  <ArrowRight className="absolute bottom-3 right-3 h-3.5 w-3.5 -translate-x-1 text-neon-purple-bright opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100" />
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Destacados */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl uppercase tracking-wide text-txt-primary">Novedades</h2>
          <Link to="/catalogo" className="inline-flex items-center gap-1 text-sm text-neon-purple-bright hover:underline">
            Ver todo <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
        {isError ? (
          <ErrorState message="No se pudieron cargar los productos." onRetry={() => refetch()} />
        ) : isLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)}
          </div>
        ) : data && data.items.length === 0 ? (
          <EmptyState title="Aún no hay productos" />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {data?.items.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </section>
    </div>
  );
}
