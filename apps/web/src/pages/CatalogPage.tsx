import { useMemo, useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAttributes, useProducts, useCategoryTree } from '../hooks/catalog';
import { ProductCard, ProductCardSkeleton } from '../components/ProductCard';
import { EmptyState, ErrorState, Spinner } from '../components/ui';
import { usePageMeta } from '../components/Layout';

const PAGE_SIZE = 12;

export default function CatalogPage() {
  const [params, setParams] = useSearchParams();
  const [showFilters, setShowFilters] = useState(false);

  const categoria = params.get('categoria') ?? '';
  const search = params.get('search') ?? '';
  const minPrice = params.get('minPrice') ?? '';
  const maxPrice = params.get('maxPrice') ?? '';
  const sort = params.get('sort') ?? 'recientes';
  const page = Number(params.get('page') ?? '1');
  const selectedAttrs = useMemo(() => params.getAll('attr'), [params]);

  usePageMeta(search ? `Buscar: ${search}` : 'Catalogo');

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
    if (selectedAttrs.length) q.set('attributeValueIds', selectedAttrs.join(','));
    return q.toString();
  }, [page, sort, categoria, search, minPrice, maxPrice, selectedAttrs]);

  const { data, isLoading, isError, isFetching, refetch } = useProducts(apiQuery);

  // Actualiza un parametro y resetea a pagina 1.
  const update = (mut: (p: URLSearchParams) => void) => {
    const next = new URLSearchParams(params);
    mut(next);
    next.set('page', '1');
    setParams(next);
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
  const hasActiveFilters = !!(minPrice || maxPrice || selectedAttrs.length || search);

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
            aria-label="Precio minimo"
          />
          <span className="text-txt-faint">—</span>
          <input
            type="number" inputMode="numeric" placeholder="Max" defaultValue={maxPrice}
            key={`max-${maxPrice}`}
            onBlur={(e) => update((p) => (e.target.value ? p.set('maxPrice', e.target.value) : p.delete('maxPrice')))}
            className="w-full rounded border border-base-border bg-base-void px-2 py-1.5 text-sm"
            aria-label="Precio maximo"
          />
        </div>
      </div>

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
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl uppercase tracking-wide text-txt-primary">
          {activeCategory?.name ?? (search ? `Resultados: "${search}"` : 'Catalogo')}
        </h1>
        <div className="flex items-center gap-2">
          {isFetching && !isLoading && <Spinner className="h-4 w-4" />}
          <button className="btn-primary py-1.5 text-sm lg:hidden" onClick={() => setShowFilters((s) => !s)}>
            Filtros {hasActiveFilters && '•'}
          </button>
          <select
            value={sort}
            onChange={(e) => update((p) => p.set('sort', e.target.value))}
            className="rounded border border-base-border bg-base-void px-2 py-1.5 text-sm"
            aria-label="Ordenar"
          >
            <option value="recientes">Mas recientes</option>
            <option value="precio_asc">Precio: menor a mayor</option>
            <option value="precio_desc">Precio: mayor a menor</option>
            <option value="nombre">Nombre A-Z</option>
          </select>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Sidebar filtros desktop */}
        <aside className="hidden w-60 shrink-0 lg:block">
          <div className="card sticky top-32 p-4">{filtersPanel}</div>
        </aside>

        {/* Filtros mobile (colapsable) */}
        {showFilters && (
          <div className="card fixed inset-x-4 top-24 z-30 max-h-[70vh] overflow-y-auto p-4 lg:hidden">
            {filtersPanel}
            <button className="btn-accent mt-4 w-full" onClick={() => setShowFilters(false)}>
              Ver resultados
            </button>
          </div>
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
            <EmptyState title="Sin resultados" hint="Proba con otros filtros o terminos de busqueda." />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {data?.items.map((p) => <ProductCard key={p.id} product={p} />)}
              </div>

              {/* Paginacion */}
              {data && data.totalPages > 1 && (
                <div className="mt-6 flex items-center justify-center gap-2">
                  <button
                    className="btn-primary py-1.5 text-sm disabled:opacity-40"
                    disabled={page <= 1}
                    onClick={() => update((p) => p.set('page', String(page - 1)))}
                  >
                    ← Anterior
                  </button>
                  <span className="text-sm text-txt-muted">
                    Pagina {data.page} de {data.totalPages}
                  </span>
                  <button
                    className="btn-primary py-1.5 text-sm disabled:opacity-40"
                    disabled={page >= data.totalPages}
                    onClick={() => update((p) => p.set('page', String(page + 1)))}
                  >
                    Siguiente →
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
