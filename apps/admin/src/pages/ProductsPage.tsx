import { useState } from 'react';
import { useAdminProducts, useProductMutations } from '../hooks/admin';
import { useAuth } from '../store/auth';
import { formatBs } from '../lib/format';
import { toast } from '../lib/toast';
import { EmptyState, ErrorState, PageLoader, StockPill } from '../components/shared';
import { ProductFormModal } from './ProductFormModal';

export default function ProductsPage() {
  const { can } = useAuth();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<string | null | undefined>(undefined); // undefined=closed, null=new
  const query = `page=${page}&pageSize=15${search ? `&search=${encodeURIComponent(search)}` : ''}`;
  const { data, isLoading, isError, refetch } = useAdminProducts(query);
  const { remove } = useProductMutations();

  const onDelete = (id: string, name: string) => {
    if (!confirm(`Desactivar el producto "${name}"? (borrado logico)`)) return;
    remove.mutate(id, {
      onSuccess: () => toast.success('Producto desactivado'),
      onError: (e) => toast.error(e instanceof Error ? e.message : 'Error'),
    });
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl uppercase tracking-wide text-txt-primary">Productos</h1>
        {can('crear_producto') && (
          <button className="btn-primary" onClick={() => setEditing(null)}>+ Nuevo producto</button>
        )}
      </div>

      <input
        className="input mb-4 max-w-md"
        placeholder="Buscar por nombre o marca…"
        value={search}
        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
      />

      {isError ? (
        <ErrorState message="No se pudieron cargar los productos." onRetry={() => refetch()} />
      ) : isLoading ? (
        <PageLoader />
      ) : data && data.items.length === 0 ? (
        <EmptyState title="Sin productos" hint="Crea el primero con el boton de arriba." />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-base-border text-left text-xs uppercase tracking-wide text-txt-faint">
                  <th className="p-2">Producto</th>
                  <th className="p-2">Categoria</th>
                  <th className="p-2">Precio base</th>
                  <th className="p-2">Variantes</th>
                  <th className="p-2">Stock</th>
                  <th className="p-2">Estado</th>
                  <th className="p-2"></th>
                </tr>
              </thead>
              <tbody>
                {data?.items.map((p) => (
                  <tr key={p.id} className="border-b border-base-border/50 hover:bg-base-panel/50">
                    <td className="p-2 font-medium text-txt-primary">
                      {p.name}
                      {p.brand && <span className="ml-1 text-xs text-txt-faint">· {p.brand}</span>}
                    </td>
                    <td className="p-2 text-txt-muted">{p.categoryName}</td>
                    <td className="p-2 text-neon-green">{formatBs(p.basePrice)}</td>
                    <td className="p-2 text-txt-muted">{p.variants.length}</td>
                    <td className="p-2"><StockPill status={p.aggregateStock} /></td>
                    <td className="p-2">
                      <span className={p.status === 'activo' ? 'text-status-stock' : 'text-txt-faint'}>
                        {p.status === 'activo' ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="p-2 text-right">
                      <button className="text-neon-purple-bright hover:underline" onClick={() => setEditing(p.id)}>Editar</button>
                      {can('eliminar_producto') && p.status === 'activo' && (
                        <button className="ml-3 text-status-out hover:underline" onClick={() => onDelete(p.id, p.name)}>Desactivar</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {data && data.totalPages > 1 && (
            <div className="mt-4 flex items-center justify-center gap-3 text-sm">
              <button className="btn-primary py-1.5" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>← Anterior</button>
              <span className="text-txt-muted">Pagina {data.page} de {data.totalPages}</span>
              <button className="btn-primary py-1.5" disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)}>Siguiente →</button>
            </div>
          )}
        </>
      )}

      {editing !== undefined && <ProductFormModal productId={editing} onClose={() => setEditing(undefined)} />}
    </div>
  );
}
