import { Link } from 'react-router-dom';
import { ArrowRight, ChevronRight, Sparkles } from 'lucide-react';
import type { CategoryNode } from '@villano/shared-types';
import { useProducts, useCategoryTree } from '../hooks/catalog';
import { ProductCardSkeleton, RevealedProductCard } from '../components/ProductCard';
import { EmptyState, ErrorState } from '../components/ui';
import { usePageMeta } from '../components/Layout';
import { getCategoryIconComponent } from '../lib/categoryIcons';
import { useReveal } from '../lib/useReveal';

/** Inclinacion magnetica: la tarjeta sigue al mouse en 3D (desktop only, los
 * eventos mousemove no disparan de forma util en touch, asi que en mobile
 * simplemente no pasa nada y queda el hover/active de siempre via CSS). */
function handleTilt(e: React.MouseEvent<HTMLElement>) {
  const el = e.currentTarget;
  const r = el.getBoundingClientRect();
  const x = (e.clientX - r.left) / r.width - 0.5;
  const y = (e.clientY - r.top) / r.height - 0.5;
  el.style.transform = `perspective(600px) rotateX(${-y * 10}deg) rotateY(${x * 10}deg) translateY(-4px)`;
}
function resetTilt(e: React.MouseEvent<HTMLElement>) {
  e.currentTarget.style.transform = '';
}

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
            <Word delay={0}>Sube</Word> <Word delay={70}>de</Word>{' '}
            <Word delay={140} shine="rgb(var(--color-neon-purple-bright))">nivel</Word>{' '}
            <Word delay={210}>tu</Word>{' '}
            <Word delay={280} shine="rgb(var(--color-neon-green))">setup</Word>
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
            {categories.map((c, i) => (
              <CategoryCard key={c.id} category={c} index={i} />
            ))}
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
            {data?.items.map((p, i) => <RevealedProductCard key={p.id} product={p} index={i} />)}
          </div>
        )}
      </section>
    </div>
  );
}

function Word({ delay, shine, children }: { delay: number; shine?: string; children: string }) {
  return (
    <span className="word-mask">
      <span
        className={shine ? 'word-in-shine' : 'word-in'}
        style={{ '--word-delay': `${delay}ms`, ...(shine ? { '--shine-base': shine } : {}) } as React.CSSProperties}
      >
        {children}
      </span>
    </span>
  );
}

function CategoryCard({ category: c, index }: { category: CategoryNode; index: number }) {
  const Icon = getCategoryIconComponent(c.icon);
  const reveal = useReveal<HTMLAnchorElement>(index * 60);
  return (
    <Link
      ref={reveal.ref}
      to={`/catalogo?categoria=${c.slug}`}
      onMouseMove={handleTilt}
      onMouseLeave={resetTilt}
      className={`tilt-card card group relative flex flex-col items-center gap-2 p-4 text-center transition-all duration-300 hover:border-neon-purple/60 hover:shadow-neon-purple active:scale-95 ${reveal.className}`}
      style={reveal.style}
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-neon-purple/10 text-neon-purple-bright transition-all duration-300 group-hover:scale-110 group-hover:bg-neon-purple/20">
        <Icon className="h-6 w-6" />
      </span>
      <span className="text-sm font-semibold text-txt-primary transition-colors group-hover:text-neon-purple-bright">
        {c.name}
      </span>
      {c.isPromo && c.promoBadgeText && (
        <span className="badge-pulse inline-flex items-center gap-1 rounded-full bg-neon-green/15 px-2 py-0.5 text-xs font-bold text-neon-green">
          <Sparkles className="h-3 w-3" /> {c.promoBadgeText}
        </span>
      )}
      <span className="text-xs text-txt-faint">{c.productCount ?? 0} productos</span>
      <ArrowRight className="absolute bottom-3 right-3 h-3.5 w-3.5 -translate-x-1 text-neon-purple-bright opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100" />
    </Link>
  );
}
