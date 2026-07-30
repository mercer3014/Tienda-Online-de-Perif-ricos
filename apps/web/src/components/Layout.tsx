import { useEffect, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import clsx from 'clsx';
import { ShoppingBag, MapPin, Star, Menu, X } from 'lucide-react';
import { useCart } from '../store/cart';
import { useCategoryTree, useStoreStatus } from '../hooks/catalog';
import { CartBar } from './CartBar';
import { CartDrawer } from './CartDrawer';
import { Spinner } from './ui';
import { ThemeToggle } from './ThemeToggle';
import { SearchAutocomplete } from './SearchAutocomplete';

function StoreStatusPill() {
  const { data, isLoading } = useStoreStatus();
  if (isLoading) return <span className="text-xs text-txt-faint">…</span>;
  if (!data) return null;
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold',
        data.isOpen
          ? 'border-status-stock/50 bg-status-stock/10 text-status-stock'
          : 'border-status-out/50 bg-status-out/10 text-status-out',
      )}
    >
      <span className={clsx('h-2 w-2 rounded-full bg-current', data.isOpen && 'animate-pulse-neon')} />
      {data.isOpen ? 'Abierta ahora' : 'Cerrada'}
    </span>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const count = useCart((s) => s.count());
  const openCart = useCart((s) => s.open);
  const { data: categories, isLoading: catLoading } = useCategoryTree();

  // Estado activo de la navegacion: consciente del query param ?categoria=.
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const activeCategoria = location.pathname === '/catalogo' ? searchParams.get('categoria') : null;
  const isCatalogAll = location.pathname === '/catalogo' && !activeCategoria && !searchParams.get('search');
  const navClass = (active: boolean) =>
    clsx(
      'rounded px-3 py-1.5 font-display uppercase tracking-wide transition-colors',
      active ? 'bg-neon-purple/15 text-neon-green' : 'text-txt-muted hover:text-neon-purple-bright',
    );

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-base-border bg-base-black/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
          <button
            className="rounded p-2 text-txt-muted hover:text-neon-purple lg:hidden"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Abrir menú"
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <Link to="/" className="shrink-0 font-display text-lg font-bold tracking-wider text-neon-purple-bright sm:text-xl">
            VILLANO<span className="text-neon-green">·</span>GAMER
          </Link>

          <div className="ml-auto hidden max-w-md flex-1 sm:block">
            <SearchAutocomplete />
          </div>

          <div className="ml-auto flex items-center gap-3 sm:ml-2">
            <div className="hidden md:block">
              <StoreStatusPill />
            </div>
            <ThemeToggle />
            <button
              onClick={openCart}
              className="relative inline-flex items-center gap-1.5 rounded-md border border-neon-purple/50 px-3 py-2 text-neon-purple-bright hover:bg-neon-purple/15 hover:shadow-neon-purple transition-all"
              aria-label={`Carrito, ${count} artículos`}
            >
              <ShoppingBag className="h-4 w-4" />
              {count > 0 && (
                <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-neon-green px-1 text-xs font-bold text-base-black">
                  {count}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Buscador mobile */}
        <div className="px-4 pb-3 sm:hidden">
          <SearchAutocomplete placeholder="Buscar…" onNavigate={() => setMenuOpen(false)} />
        </div>

        {/* Nav categorias desktop */}
        <nav className="hidden border-t border-base-border/60 lg:block">
          <div className="mx-auto flex max-w-7xl items-center gap-1 px-4 py-2 text-sm">
            <Link to="/catalogo" className={navClass(isCatalogAll)} aria-current={isCatalogAll ? 'page' : undefined}>
              Todo
            </Link>
            {catLoading && <Spinner className="h-4 w-4" />}
            {categories?.map((c) => {
              const active = activeCategoria === c.slug;
              return (
                <Link
                  key={c.id}
                  to={`/catalogo?categoria=${c.slug}`}
                  className={clsx('inline-flex items-center gap-1', navClass(active))}
                  aria-current={active ? 'page' : undefined}
                >
                  {c.name}
                  {c.isPromo && <Star className="h-3.5 w-3.5 text-neon-green fill-neon-green" />}
                </Link>
              );
            })}
            <Link
              to="/ubicacion"
              className={clsx('ml-auto inline-flex items-center gap-1.5', navClass(location.pathname === '/ubicacion'))}
              aria-current={location.pathname === '/ubicacion' ? 'page' : undefined}
            >
              <MapPin className="h-4 w-4 text-neon-purple-bright" /> Ubicación
            </Link>
          </div>
        </nav>
      </header>

      {/* Menu mobile desplegable */}
      {menuOpen && (
        <div className="border-b border-base-border bg-base-graphite lg:hidden">
          <div className="flex flex-col gap-1 p-4">
            <div className="mb-1"><StoreStatusPill /></div>
            <MobileLink to="/catalogo" active={isCatalogAll} onClick={() => setMenuOpen(false)}>Todo el catalogo</MobileLink>
            {categories?.map((c) => (
              <MobileLink key={c.id} to={`/catalogo?categoria=${c.slug}`} active={activeCategoria === c.slug} onClick={() => setMenuOpen(false)}>
                <span className="inline-flex items-center gap-1">
                  {c.name} {c.isPromo && <Star className="h-3.5 w-3.5 text-neon-green fill-neon-green" />}
                </span>
              </MobileLink>
            ))}
            <MobileLink to="/ubicacion" active={location.pathname === '/ubicacion'} onClick={() => setMenuOpen(false)}>
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-neon-purple-bright" /> Ubicación y horarios
              </span>
            </MobileLink>
          </div>
        </div>
      )}

      <main className={clsx('mx-auto w-full max-w-7xl flex-1 px-4 py-6', count > 0 && 'pb-24')}>{children}</main>

      <footer className="border-t border-base-border bg-base-void">
        <div className="mx-auto max-w-7xl px-4 py-6 text-center text-sm text-txt-faint">
          <p className="font-display uppercase tracking-widest text-txt-muted">Villano Gamer Store</p>
          <p className="mt-1">Periféricos gamer · Santa Cruz de la Sierra, Bolivia</p>
          <p className="mt-1">Pedidos coordinados por WhatsApp · Sin pago online</p>
        </div>
      </footer>

      <CartDrawer />
      <CartBar />
    </div>
  );
}

function MobileLink({ to, active, children, onClick }: { to: string; active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={clsx(
        'rounded-md px-3 py-2.5 font-display uppercase tracking-wide',
        active ? 'bg-neon-purple/15 text-neon-green' : 'text-txt-primary hover:bg-base-panel',
      )}
    >
      {children}
    </Link>
  );
}

export { StoreStatusPill };

// Efecto de titulo dinamico por pagina.
export function usePageMeta(title: string, description?: string) {
  useEffect(() => {
    document.title = title ? `${title} · Villano Gamer Store` : 'Villano Gamer Store';
    if (description) {
      let tag = document.querySelector('meta[name="description"]');
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute('name', 'description');
        document.head.appendChild(tag);
      }
      tag.setAttribute('content', description);
    }
  }, [title, description]);
}
