import { useMemo, useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAttributes, useProducts, useCategoryTree } from '../hooks/catalog';
import { ProductCard, ProductCardSkeleton } from '../components/ProductCard';
import { EmptyState, ErrorState, Spinner } from '../components/ui';
import { usePageMeta } from '../components/Layout';
import { useDismissable } from '../lib/useDismissable';

const PAGE_SIZE = 12;

export default function CatalogPage() {
  const [params, setParams] = useSearchParams();
  const [showFilters, setShowFilters] = useState(false);
  // Escape cierra el panel de filtros y se bloquea el scroll del fondo.
  useDismissable(showFilters, () => setShowFilters(false));

  const categoria = params.get('categoria') ?? '';
  const search = params.get('search') ?? '';
  const minPrice = params.get('minPrice') ?? '';
  const maxPrice = params.get('maxPrice') ?? '';
  const inStock = params.get('inStock') === '1';
  const sort = params.get('sort') ?? 'recientes';
  const page = Number(params.get('page') ?? '1');
  const selectedAttrs = useMemo(() => params.getAll('attr'), [params]);

  usePageMeta(search ? `Buscar: ${search}` : 'Catálogo');

  const { data: attributes } = useAttributes();
  const { data: categories } = useCategoryTree();

  // Construye el query string para la API a partir de la URL.
  const apiQuery = useMemo(() => {
    const q = new URLSearchParams();
    q.set('page', String(page));
    q.set('pageSize', String(PAGE_SIZE));
    q.set('sort', sort);
    if (categoria) q.set('categorySlug', categoria);
    if (search) q.set('search', search);
    if (minPrice) q.set('minPrice', minPrice);
    if (maxPrice) q.set('maxPrice', maxPrice);
    if (inStock) q.set('inStock', 'true');
    if (selectedAttrs.length) q.set('attributeValueIds', selectedAttrs.join(','));
    return q.toString();
  }, [page, sort, categoria, search, minPrice, maxPrice, inStock, selectedAttrs]);

  const { data, isLoading, isError, isFetching, refetch } = useProducts(apiQuery);

  // Actualiza un filtro y resetea a pagina 1 (cambiar un filtro cambia los resultados).
  const update = (mut: (p: URLSearchParams) => void) => {
    const next = new URLSearchParams(params);
    mut(next);
    next.set('page', '1');
    setParams(next);
  };

  // Navegacion de paginas: cambia SOLO el numero de pagina (sin resetear filtros ni volver a 1).
  const goToPage = (target: number) => {
    const next = new URLSearchParams(params);
    next.set('page', String(target));
    setParams(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleAttr = (valueId: string) =>
    update((p) => {
      const current = p.getAll('attr');
      p.delete('attr');
      const set = new Set(current);
      if (set.has(valueId)) set.delete(valueId);
      else set.add(valueId);
      set.forEach((v) => p.append('attr', v));
    });

  const clearFilters = () => setParams(categoria ? new URLSearchParams({ categoria }) : new URLSearchParams());

  const activeCategory = categories?.find((c) => c.slug === categoria);
  const hasActiveFilters = !!(minPrice || maxPrice || selectedAttrs.length || search || inStock);
  const filterCount =
    (categoria ? 1 : 0) + (minPrice ? 1 : 0) + (maxPrice ? 1 : 0) + (inStock ? 1 : 0) + selectedAttrs.length;

  // Cierra el panel de filtros al pasar a desktop.
  useEffect(() => {
    const onResize = () => window.innerWidth >= 1024 && setShowFilters(false);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const filtersPanel = (
    <div className="space-y-6">
      <div>
        <h3 className="mb-2 font-display text-sm uppercase tracking-wide text-neon-purple-bright">Precio (Bs.)</h3>
        <div className="flex items-center gap-2">
          <input
            type="number" inputMode="numeric" placeholder="Min" defaultValue={minPrice}
            key={`min-${minPrice}`}
            onBlur={(e) => update((p) => (e.target.value ? p.set('minPrice', e.target.value) : p.delete('minPrice')))}
            className="w-full rounded border border-base-border bg-base-void px-2 py-1.5 text-sm"
            aria-label="Precio mínimo"
          />
          <span className="text-txt-faint">a</span>
          <input
            type="number" inputMode="numeric" placeholder="Max" defaultValue={maxPrice}
            key={`max-${maxPrice}`}
            onBlur={(e) => update((p) => (e.target.value ? p.set('maxPrice', e.target.value) : p.delete('maxPrice')))}
            className="w-full rounded border border-base-border bg-base-void px-2 py-1.5 text-sm"
            aria-label="Precio máximo"
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-txt-muted">
        <input
          type="checkbox"
          checked={inStock}
          onChange={(e) => update((p) => (e.target.checked ? p.set('inStock', '1') : p.delete('inStock')))}
          className="accent-neon-green"
        />
        Solo en stock
      </label>

      {attributes?.map((attr) => (
        <div key={attr.id}>
          <h3 className="mb-2 font-display text-sm uppercase tracking-wide text-neon-purple-bright">{attr.name}</h3>
          <div className="flex flex-wrap gap-2">
            {attr.values.map((v) => {
              const active = selectedAttrs.includes(v.id);
              return (
                <button
                  key={v.id}
                  onClick={() => toggleAttr(v.id)}
                  aria-pressed={active}
                  className={`rounded-full border px-3 py-1 text-sm transition-colors ${active ? 'border-neon-green bg-neon-green/15 text-neon-green' : 'border-base-border text-txt-muted hover:border-neon-purple/60'}`}
                >
                  {v.value}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {hasActiveFilters && (
        <button onClick={clearFilters} className="text-sm text-status-out hover:underline">
          Limpiar filtros
        </button>
      )}
    </div>
  );

  return (
    <div>
      <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl uppercase tracking-wide text-txt-primary">
          {activeCategory?.name ?? (search ? `Resultados: "${search}"` : 'Catálogo')}
        </h1>
        <div className="flex items-center gap-2">
          {isFetching && !isLoading && <Spinner className="h-4 w-4" />}
          <button
            className="btn-primary inline-flex items-center gap-1.5 py-1.5 text-sm lg:hidden"
            onClick={() => setShowFilters((s) => !s)}
          >
            Filtros
            {filterCount > 0 && (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-base-black/25 px-1 text-xs font-bold">
                {filterCount}
              </span>
            )}
          </button>
          <select
            value={sort}
            onChange={(e) => update((p) => p.set('sort', e.target.value))}
            className="rounded border border-base-border bg-base-void px-2 py-1.5 text-sm"
            aria-label="Ordenar"
          >
            <option value="recientes">Más recientes</option>
            <option value="precio_asc">Precio: menor a mayor</option>
            <option value="precio_desc">Precio: mayor a menor</option>
            <option value="nombre">Nombre A-Z</option>
          </select>
        </div>
      </div>

      {!isLoading && data && (
        <p className="mb-3 text-sm text-txt-faint">
          {data.total} {data.total === 1 ? 'resultado' : 'resultados'}
        </p>
      )}

      <div className="flex gap-6">
        {/* Sidebar filtros desktop */}
        <aside className="hidden w-60 shrink-0 lg:block">
          <div className="card sticky top-32 p-4">{filtersPanel}</div>
        </aside>

        {/* Filtros mobile: panel con backdrop, boton X, Escape y scroll-lock */}
        {showFilters && (
          <>
            <div
              className="fixed inset-0 z-30 bg-black/70 lg:hidden"
              onClick={() => setShowFilters(false)}
              aria-hidden
            />
            <div
              className="card fixed inset-x-4 top-20 z-40 flex max-h-[75vh] flex-col lg:hidden"
              role="dialog"
              aria-label="Filtros"
            >
              <div className="flex items-center justify-between border-b border-base-border px-4 py-3">
                <h2 className="font-display text-sm uppercase tracking-wide text-txt-primary">Filtros</h2>
                <button
                  onClick={() => setShowFilters(false)}
                  className="rounded p-1 text-txt-muted hover:text-neon-purple"
                  aria-label="Cerrar filtros"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4">{filtersPanel}</div>
              <div className="border-t border-base-border p-3">
                <button className="btn-accent w-full" onClick={() => setShowFilters(false)}>
                  Ver resultados
                </button>
              </div>
            </div>
          </>
        )}

        {/* Resultados */}
        <div className="min-w-0 flex-1">
          {isError ? (
            <ErrorState message="No se pudieron cargar los productos." onRetry={() => refetch()} />
          ) : isLoading ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {Array.from({ length: 9 }).map((_, i) => <ProductCardSkeleton key={i} />)}
            </div>
          ) : data && data.items.length === 0 ? (
            <EmptyState
              title="Sin resultados"
              hint="Prueba con otros filtros o términos de búsqueda."
              action={hasActiveFilters ? { label: 'Limpiar filtros', onClick: clearFilters } : undefined}
            />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {data?.items.map((p) => <ProductCard key={p.id} product={p} />)}
              </div>

              {/* Paginacion */}
              {data && data.totalPages > 1 && (
                <div className="mt-6 flex items-center justify-center gap-2">
                  <button
                    className="btn-secondary inline-flex items-center gap-1 py-1.5 text-sm disabled:opacity-40"
                    disabled={page <= 1}
                    onClick={() => goToPage(page - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" /> Anterior
                  </button>
                  <span className="text-sm text-txt-muted">
                    Página {data.page} de {data.totalPages}
                  </span>
                  <button
                    className="btn-secondary inline-flex items-center gap-1 py-1.5 text-sm disabled:opacity-40"
                    disabled={page >= data.totalPages}
                    onClick={() => goToPage(page + 1)}
                  >
                    Siguiente <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
