import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import clsx from 'clsx';
import { ShoppingCart, MapPin, Megaphone, MessageCircle, Star, Menu, X, ChevronDown, ChevronRight } from 'lucide-react';
import type { CategoryNode } from '@villano/shared-types';
import { useCart } from '../store/cart';
import { useCategoryTree, useStoreStatus } from '../hooks/catalog';
import { formatWhatsappNumber } from '../lib/format';
import { useBump } from '../lib/useBump';
import { CartBar } from './CartBar';
import { CartDrawer } from './CartDrawer';
import { Spinner } from './ui';
import { ThemeToggle } from './ThemeToggle';
import { SearchAutocomplete } from './SearchAutocomplete';
import { useDismissable } from '../lib/useDismissable';

export function Layout({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  // El panel necesita 3 estados (no solo menuOpen) para animar en AMBAS
  // direcciones: "mounted" lo mantiene en el DOM un instante despues de
  // cerrar (si no, desaparece de golpe antes de que se vea la transicion de
  // salida); "visible" arranca en false incluso al abrir, para que el
  // navegador pinte un primer frame en 0fr y recien en el siguiente pase a
  // 1fr -si "visible" se pusiera true de una, no habria dos frames distintos
  // entre los que animar y se veria un salto instantaneo al abrir.
  const [menuMounted, setMenuMounted] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const rafRef = useRef(0);
  useEffect(() => {
    if (menuOpen) {
      setMenuMounted(true);
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = requestAnimationFrame(() => setMenuVisible(true));
      });
      return () => cancelAnimationFrame(rafRef.current);
    }
    setMenuVisible(false);
    if (!menuMounted) return;
    const t = setTimeout(() => setMenuMounted(false), 300);
    return () => clearTimeout(t);
  }, [menuOpen, menuMounted]);
  useDismissable(menuOpen, () => setMenuOpen(false));
  const count = useCart((s) => s.count());
  const openCart = useCart((s) => s.open);
  const cartBumping = useBump(count);
  const { data: categories, isLoading: catLoading } = useCategoryTree();
  const { data: storeStatus } = useStoreStatus();

  // Estado activo de la navegacion: consciente del query param ?categoria=.
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const activeCategoria = location.pathname === '/catalogo' ? searchParams.get('categoria') : null;
  const isCatalogAll = location.pathname === '/catalogo' && !activeCategoria && !searchParams.get('search');
  const navClass = (active: boolean) =>
    clsx(
      'rounded px-3 py-1.5 font-display uppercase tracking-wide transition-colors',
      active ? 'bg-neon-purple/15 text-neon-purple-bright' : 'text-txt-muted hover:text-neon-purple-bright',
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
            <ThemeToggle />
            <button
              id="cart-icon"
              onClick={openCart}
              className="relative inline-flex items-center gap-1.5 rounded-md border border-neon-purple/50 px-3 py-2 text-neon-purple-bright hover:bg-neon-purple/15 hover:shadow-neon-purple transition-all"
              aria-label={`Carrito, ${count} artículos`}
            >
              <ShoppingCart className="h-4 w-4" />
              {count > 0 && (
                <span
                  className={`absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-neon-green px-1 text-xs font-bold text-base-black ${cartBumping ? 'cart-bump' : ''}`}
                >
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
            {categories?.map((c) => (
              <CategoryNavItem key={c.id} category={c} activeCategoria={activeCategoria} navClass={navClass} />
            ))}
            <div className="ml-auto flex items-center gap-4">
              {storeStatus && (
                <a
                  href={`https://wa.me/${storeStatus.whatsappNumber.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-txt-muted transition-colors hover:text-neon-green"
                >
                  <MessageCircle className="h-4 w-4" /> {formatWhatsappNumber(storeStatus.whatsappNumber)}
                </a>
              )}
              <Link
                to="/ubicacion"
                className={clsx('inline-flex items-center gap-1.5', navClass(location.pathname === '/ubicacion'))}
                aria-current={location.pathname === '/ubicacion' ? 'page' : undefined}
              >
                <MapPin className="h-4 w-4 text-neon-purple-bright" /> Ubicación
              </Link>
            </div>
          </div>
        </nav>

        {/* Menu mobile desplegable: vive DENTRO del header (sticky) para que
            siempre quede anclado justo debajo de este sin importar el scroll
            de la pagina (antes era hermano del header y quedaba "arriba del
            todo", fuera de la vista, si se abria estando scrolleado). El
            truco grid-rows 0fr->1fr anima una altura que no se conoce de
            antemano (la lista de categorias es variable), sin JS de por medio. */}
        {menuMounted && (
          <div
            className={clsx(
              'overflow-hidden bg-base-graphite transition-[max-height,opacity] duration-300 ease-in-out lg:hidden',
              menuVisible ? 'max-h-[calc(100vh-7rem)] border-t border-base-border opacity-100' : 'max-h-0 opacity-0',
            )}
          >
            <div className="overflow-y-auto">
              <div className="flex flex-col gap-1 p-4">
                <MobileLink to="/catalogo" active={isCatalogAll} onClick={() => setMenuOpen(false)}>Todo el catalogo</MobileLink>
                {categories?.map((c) => (
                  <MobileCategoryItem key={c.id} category={c} depth={0} activeCategoria={activeCategoria} onNavigate={() => setMenuOpen(false)} />
                ))}
                <MobileLink to="/ubicacion" active={location.pathname === '/ubicacion'} onClick={() => setMenuOpen(false)}>
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 text-neon-purple-bright" /> Ubicación y horarios
                  </span>
                </MobileLink>
                {storeStatus && (
                  <a
                    href={`https://wa.me/${storeStatus.whatsappNumber.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setMenuOpen(false)}
                    className="rounded-md px-3 py-2.5 font-display uppercase tracking-wide text-txt-primary hover:bg-base-panel"
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <MessageCircle className="h-4 w-4 text-neon-green" /> {formatWhatsappNumber(storeStatus.whatsappNumber)}
                    </span>
                  </a>
                )}
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Comunicado opcional configurado desde el admin (feriados, promos, avisos puntuales). */}
      {storeStatus?.announcement && (
        <div className="bg-neon-purple/15 px-4 py-2 text-center text-sm text-neon-purple-bright">
          <Megaphone className="mr-1.5 inline h-4 w-4 shrink-0" />
          {storeStatus.announcement}
        </div>
      )}

      {/* Overlay oscuro detras del menu: hermano del header (no hijo) para que
          el header con el menu abierto quede siempre por encima, sin oscurecerse. */}
      {menuMounted && (
        <div
          className={clsx(
            'fixed inset-0 z-30 bg-black/50 transition-opacity duration-300 lg:hidden',
            menuVisible ? 'opacity-100' : 'opacity-0',
          )}
          onClick={() => setMenuOpen(false)}
          aria-hidden
        />
      )}

      <main className={clsx('mx-auto w-full max-w-7xl flex-1 px-4 py-6', count > 0 && 'pb-24')}>{children}</main>

      <footer className="border-t border-base-border bg-base-void">
        <div className="mx-auto max-w-7xl px-4 py-6 text-center text-sm text-txt-faint">
          <p className="font-display uppercase tracking-widest text-txt-muted">Villano Gamer Store</p>
          <p className="mt-1">Periféricos gamer · Santa Cruz de la Sierra, Bolivia</p>
          {storeStatus ? (
            <a
              href={`https://wa.me/${storeStatus.whatsappNumber.replace(/\D/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1.5 text-txt-muted transition-colors hover:text-neon-green"
            >
              <MessageCircle className="h-4 w-4" /> {formatWhatsappNumber(storeStatus.whatsappNumber)} · Sin pago online
            </a>
          ) : (
            <p className="mt-1">Pedidos coordinados por WhatsApp · Sin pago online</p>
          )}
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
        active ? 'bg-neon-purple/15 text-neon-purple-bright' : 'text-txt-primary hover:bg-base-panel',
      )}
    >
      {children}
    </Link>
  );
}

/**
 * Item de nav desktop con dropdown al pasar el cursor: si la categoria tiene
 * hijos, se despliegan debajo (y los nietos, indentados dentro del mismo
 * panel) sin importar la profundidad del arbol. Click en el padre navega a
 * la vista agregada (padre + toda su descendencia, ya resuelto en el backend).
 */
function CategoryNavItem({
  category,
  activeCategoria,
  navClass,
}: {
  category: CategoryNode;
  activeCategoria: string | null;
  navClass: (active: boolean) => string;
}) {
  const [open, setOpen] = useState(false);
  const hasChildren = category.children.length > 0;
  const active = activeCategoria === category.slug;

  return (
    <div
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <Link
        to={`/catalogo?categoria=${category.slug}`}
        className={clsx('inline-flex items-center gap-1', navClass(active))}
        aria-current={active ? 'page' : undefined}
        aria-expanded={hasChildren ? open : undefined}
      >
        {category.name}
        {category.isPromo && <Star className="h-3.5 w-3.5 text-neon-green fill-neon-green" />}
        {hasChildren && <ChevronDown className="h-3 w-3 opacity-70" />}
      </Link>
      {hasChildren && open && (
        <div className="absolute left-0 top-full z-50 min-w-[220px] rounded-md border border-base-border bg-base-panel py-1.5 shadow-panel">
          {category.children.map((child) => (
            <CategorySubItem key={child.id} category={child} depth={0} activeCategoria={activeCategoria} />
          ))}
        </div>
      )}
    </div>
  );
}

function CategorySubItem({ category, depth, activeCategoria }: { category: CategoryNode; depth: number; activeCategoria: string | null }) {
  const active = activeCategoria === category.slug;
  return (
    <>
      <Link
        to={`/catalogo?categoria=${category.slug}`}
        aria-current={active ? 'page' : undefined}
        style={{ paddingLeft: `${12 + depth * 16}px` }}
        className={clsx(
          'block py-2 pr-3 text-sm transition-colors',
          active ? 'text-neon-green' : 'text-txt-muted hover:bg-base-border/20 hover:text-neon-purple-bright',
        )}
      >
        {category.name}
        {category.isPromo && <Star className="ml-1.5 inline h-3 w-3 text-neon-green fill-neon-green" />}
      </Link>
      {category.children.map((c) => (
        <CategorySubItem key={c.id} category={c} depth={depth + 1} activeCategoria={activeCategoria} />
      ))}
    </>
  );
}

/** Version movil: cada nivel se expande/colapsa por separado, tocando la flechita. */
function MobileCategoryItem({
  category,
  depth,
  activeCategoria,
  onNavigate,
}: {
  category: CategoryNode;
  depth: number;
  activeCategoria: string | null;
  onNavigate: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasChildren = category.children.length > 0;
  const active = activeCategoria === category.slug;

  return (
    <div>
      <div className="flex items-center" style={{ paddingLeft: `${depth * 12}px` }}>
        <MobileLink to={`/catalogo?categoria=${category.slug}`} active={active} onClick={onNavigate}>
          <span className="inline-flex items-center gap-1">
            {category.name}
            {category.isPromo && <Star className="h-3.5 w-3.5 text-neon-green fill-neon-green" />}
          </span>
        </MobileLink>
        {hasChildren && (
          <button
            onClick={() => setExpanded((e) => !e)}
            aria-label={expanded ? `Ocultar subcategorías de ${category.name}` : `Mostrar subcategorías de ${category.name}`}
            aria-expanded={expanded}
            className="ml-1 shrink-0 rounded-md p-2.5 text-txt-muted hover:text-neon-purple"
          >
            <ChevronRight className={clsx('h-4 w-4 transition-transform', expanded && 'rotate-90')} />
          </button>
        )}
      </div>
      {hasChildren && expanded && (
        <div className="flex flex-col gap-1">
          {category.children.map((c) => (
            <MobileCategoryItem key={c.id} category={c} depth={depth + 1} activeCategoria={activeCategoria} onNavigate={onNavigate} />
          ))}
        </div>
      )}
    </div>
  );
}

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
