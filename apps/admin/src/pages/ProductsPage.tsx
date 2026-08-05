import { useMemo, useRef, useState } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, Pencil, Trash2, Search, Plus, Eye, EyeOff } from 'lucide-react';
import type { ProductDetailDTO, StockStatus } from '@villano/shared-types';
import { useAdminProducts, useAdminCategoryTree, useProductMutations } from '../hooks/admin';
import { useAuth } from '../store/auth';
import { formatBs } from '../lib/format';
import { toast } from '../lib/toast';
import { confirmAction } from '../lib/confirm';
import { flattenCategories, collectIdsWithDescendants } from '../lib/categoryTree';
import { ActionIcon, EmptyState, ErrorState, PageLoader, StockPill, Thumb } from '../components/shared';
import { ProductFormModal } from './ProductFormModal';

type SortKey = 'name' | 'category' | 'basePrice' | 'variants' | 'stock' | 'status';
const STOCK_RANK: Record<StockStatus, number> = { agotado: 0, pocas_unidades: 1, en_stock: 2 };

export default function ProductsPage() {
  const { can } = useAuth();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'name', dir: 1 });
  const [editing, setEditing] = useState<string | null | undefined>(undefined);
  const [searchFocus, setSearchFocus] = useState(false);
  const searchBoxRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, isError, refetch } = useAdminProducts('page=1&pageSize=200');
  const { data: categoryTree } = useAdminCategoryTree();
  const { remove, removePermanent, update } = useProductMutations();

  // Todos los niveles del arbol (padres incluidos), no solo las categorias
  // hoja a las que efectivamente se asignan productos.
  const categoryOptions = useMemo(() => (categoryTree ? flattenCategories(categoryTree) : []), [categoryTree]);
  // Filtrar por un padre debe traer tambien los productos de sus descendientes,
  // sin importar la profundidad del arbol (escalable a cualquier estructura).
  const categoryFilterIds = useMemo(
    () => (category && categoryTree ? collectIdsWithDescendants(categoryTree, category) : null),
    [category, categoryTree],
  );

  const bySearch = (p: ProductDetailDTO) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return p.name.toLowerCase().includes(s) || (p.brand ?? '').toLowerCase().includes(s);
  };

  // Sugerencias del buscador (dropdown en vivo).
  const suggestions = useMemo(() => {
    if (!search.trim()) return [];
    return (data?.items ?? []).filter(bySearch).slice(0, 6);
  }, [data, search]);

  const rows = useMemo(() => {
    let items = (data?.items ?? []).filter(bySearch);
    if (categoryFilterIds) items = items.filter((p) => categoryFilterIds.has(p.categoryId));
    if (status) items = items.filter((p) => p.status === status);
    return [...items].sort((a, b) => {
      const dir = sort.dir;
      switch (sort.key) {
        case 'name': return a.name.localeCompare(b.name) * dir;
        case 'category': return a.categoryName.localeCompare(b.categoryName) * dir;
        case 'basePrice': return (a.basePrice - b.basePrice) * dir;
        case 'variants': return (a.variants.length - b.variants.length) * dir;
        case 'stock': return (STOCK_RANK[a.aggregateStock] - STOCK_RANK[b.aggregateStock]) * dir;
        case 'status': return a.status.localeCompare(b.status) * dir;
        default: return 0;
      }
    });
  }, [data, search, categoryFilterIds, status, sort]);

  const toggleSort = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, dir: (s.dir * -1) as 1 | -1 } : { key, dir: 1 }));

  const onHide = async (p: ProductDetailDTO) => {
    const ok = await confirmAction({
      title: `¿Ocultar "${p.name}" del catálogo público?`,
      description: 'El cliente ya no lo va a ver en la tienda. El producto sigue guardado en el sistema y podés volver a mostrarlo cuando quieras.',
      confirmLabel: 'Ocultar del catálogo',
    });
    if (!ok) return;
    remove.mutate(p.id, {
      onSuccess: () => toast.success('Producto oculto del catálogo'),
      onError: (e) => toast.error(e instanceof Error ? e.message : 'Error'),
    });
  };

  const onShow = async (p: ProductDetailDTO) => {
    update.mutate(
      { id: p.id, body: { status: 'activo' } },
      {
        onSuccess: () => toast.success('Producto visible en el catálogo'),
        onError: (e) => toast.error(e instanceof Error ? e.message : 'Error'),
      },
    );
  };

  const onDeletePermanent = async (p: ProductDetailDTO) => {
    const ok = await confirmAction({
      title: `¿Eliminar "${p.name}" para siempre?`,
      description: 'Esto borra el producto, sus variantes y sus imágenes de la base de datos DEFINITIVAMENTE. No se puede deshacer. Los pedidos ya realizados con este producto no se ven afectados.',
      confirmLabel: 'Eliminar para siempre',
      danger: true,
    });
    if (!ok) return;
    removePermanent.mutate(p.id, {
      onSuccess: () => toast.success('Producto eliminado permanentemente'),
      onError: (e) => toast.error(e instanceof Error ? e.message : 'Error'),
    });
  };

  const SortHead = ({ label, k }: { label: string; k: SortKey }) => (
    <th className="p-3">
      <button className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-txt-muted hover:text-txt-primary" onClick={() => toggleSort(k)}>
        {label}
        {sort.key !== k ? <ArrowUpDown className="h-3 w-3 opacity-50" /> : sort.dir === 1 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
      </button>
    </th>
  );

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl tracking-wide text-txt-primary">Productos</h1>
        {can('crear_producto') && (
          <button className="btn-primary inline-flex items-center gap-1.5" onClick={() => setEditing(null)}>
            <Plus className="h-4 w-4" /> Nuevo producto
          </button>
        )}
      </div>

      <div className="mb-4 grid gap-2 sm:grid-cols-3">
        {/* Buscador con dropdown en vivo */}
        <div className="relative" ref={searchBoxRef}>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-txt-faint" />
          <input
            className="input pl-9"
            placeholder="Buscar por nombre o marca…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onFocus={() => setSearchFocus(true)}
            onBlur={() => setTimeout(() => setSearchFocus(false), 150)}
          />
          {searchFocus && suggestions.length > 0 && (
            <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-md border border-base-border bg-base-panel shadow-panel">
              {suggestions.map((p) => (
                <button
                  key={p.id}
                  className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-base-border/30"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => { setEditing(p.id); setSearch(''); }}
                >
                  <Thumb url={p.primaryImage} alt={p.name} size={36} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-txt-primary">{p.name}</span>
                    {p.brand && <span className="block truncate text-xs text-txt-faint">{p.brand}</span>}
                  </span>
                  <span className="shrink-0 text-sm font-semibold text-neon-green">{formatBs(p.basePrice)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">Todas las categorías</option>
          {categoryOptions.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
        <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Cualquier visibilidad</option>
          <option value="activo">Visible en el catálogo</option>
          <option value="inactivo">Oculto del catálogo</option>
        </select>
      </div>

      {isError ? (
        <ErrorState message="No se pudieron cargar los productos." onRetry={() => refetch()} />
      ) : isLoading ? (
        <PageLoader />
      ) : rows.length === 0 ? (
        <EmptyState title="Sin productos" hint="Ajustá los filtros o creá el primero." />
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-base-border text-left">
                <th className="p-3" />
                <SortHead label="Producto" k="name" />
                <SortHead label="Categoría" k="category" />
                <SortHead label="Precio" k="basePrice" />
                <SortHead label="Variantes" k="variants" />
                <SortHead label="Stock" k="stock" />
                <SortHead label="Visibilidad" k="status" />
                <th className="p-3 text-right text-xs font-semibold uppercase tracking-wide text-txt-muted">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id} className="border-b border-base-border/40 odd:bg-base-void/40 hover:bg-base-border/20">
                  <td className="py-2 pl-3">
                    <Thumb url={p.primaryImage} alt={p.name} />
                  </td>
                  <td className="p-3 font-medium text-txt-primary">
                    {p.name}
                    {p.brand && <span className="ml-1 text-xs text-txt-faint">· {p.brand}</span>}
                  </td>
                  <td className="p-3 text-txt-muted">{p.categoryName}</td>
                  <td className="p-3 font-semibold text-txt-primary">
                    {formatBs(p.basePrice)}
                    {p.originalPrice != null && p.originalPrice > p.basePrice && (
                      <span className="ml-1 text-xs font-normal text-txt-faint line-through">{formatBs(p.originalPrice)}</span>
                    )}
                  </td>
                  <td className="p-3 text-txt-muted">{p.variants.length}</td>
                  <td className="p-3"><StockPill status={p.aggregateStock} /></td>
                  <td className="p-3">
                    <span
                      className={p.status === 'activo' ? 'badge badge-success' : 'badge badge-danger'}
                      title={p.status === 'activo' ? 'Visible: los clientes lo ven en el catálogo público' : 'Oculto: no aparece en el catálogo público, pero sigue guardado en el sistema'}
                    >
                      {p.status === 'activo' ? 'Visible' : 'Oculto'}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center justify-end gap-1">
                      <ActionIcon icon={Pencil} label="Editar producto" onClick={() => setEditing(p.id)} />
                      {can('eliminar_producto') && (
                        p.status === 'activo' ? (
                          <ActionIcon icon={EyeOff} label="Ocultar del catálogo público" disabled={remove.isPending} onClick={() => onHide(p)} />
                        ) : (
                          <ActionIcon icon={Eye} label="Mostrar en el catálogo público" disabled={update.isPending} onClick={() => onShow(p)} />
                        )
                      )}
                      {can('eliminar_producto') && (
                        <ActionIcon icon={Trash2} label="Eliminar para siempre" danger disabled={removePermanent.isPending} onClick={() => onDeletePermanent(p)} />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-2 text-xs text-txt-faint">{rows.length} producto(s)</p>

      {editing !== undefined && (
        <ProductFormModal productId={editing} onClose={() => setEditing(undefined)} onCreated={(id) => setEditing(id)} />
      )}
    </div>
  );
}
