import { useState } from 'react';
import { ArrowRight, Download } from 'lucide-react';
import { useAudit, useUsers } from '../hooks/admin';
import { useAuth } from '../store/auth';
import { apiDownload } from '../lib/api';
import { formatDateTime } from '../lib/format';
import { toast } from '../lib/toast';
import { EmptyState, ErrorState, PageLoader, Pagination } from '../components/shared';

const ENTITY_TYPES = ['product', 'variant', 'category', 'attribute', 'attribute_value', 'order', 'role', 'user'];

// Etiquetas legibles (en vez de claves crudas).
const ACTION_LABEL: Record<string, string> = {
  crear_producto: 'Creó un producto',
  editar_producto: 'Editó un producto',
  eliminar_producto: 'Ocultó un producto del catálogo',
  ocultar_producto: 'Ocultó un producto del catálogo',
  eliminar_producto_permanente: 'Eliminó un producto permanentemente',
  editar_precio: 'Cambió un precio',
  editar_stock: 'Cambió el stock',
  crear_variante: 'Creó una variante',
  editar_variante: 'Editó una variante',
  eliminar_variante: 'Eliminó una variante',
  gestionar_imagenes: 'Gestionó imágenes',
  crear_categoria: 'Creó una categoría',
  modificar_categoria: 'Modificó una categoría',
  eliminar_categoria: 'Ocultó una categoría del catálogo',
  ocultar_categoria: 'Ocultó una categoría del catálogo',
  eliminar_categoria_permanente: 'Eliminó una categoría permanentemente',
  cambiar_estado_pedido: 'Cambió el estado de un pedido',
  gestionar_roles: 'Actualizó permisos de un rol',
  gestionar_usuarios: 'Gestionó un usuario',
  crear_atributo: 'Creó un atributo',
  eliminar_atributo: 'Eliminó un atributo',
  crear_valor_atributo: 'Creó un valor de atributo',
  eliminar_valor_atributo: 'Eliminó un valor de atributo',
};
const ENTITY_LABEL: Record<string, string> = {
  product: 'Producto', variant: 'Variante', category: 'Categoría',
  order: 'Pedido', role: 'Rol', user: 'Usuario',
  attribute: 'Atributo', attribute_value: 'Valor de atributo',
};
const FIELD_LABEL: Record<string, string> = {
  name: 'Nombre', slug: 'Slug', status: 'Estado', basePrice: 'Precio base',
  price: 'Precio', stock: 'Stock', sku: 'SKU', active: 'Activo', email: 'Email',
  role: 'Rol', parentId: 'Categoría padre', displayOrder: 'Orden', isPromo: 'Promoción',
  added: 'Imagen agregada', removed: 'Imagen eliminada', primary: 'Imagen principal',
};

function fmt(v: unknown): string {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'boolean') return v ? 'Sí' : 'No';
  if (typeof v === 'number') return String(v);
  if (typeof v === 'string') return v.length > 60 ? v.slice(0, 57) + '…' : v;
  if (Array.isArray(v)) return `${v.length} elemento(s)`;
  return JSON.stringify(v);
}

/** Convierte old/new value en una lista legible de cambios campo→campo. */
function toChanges(oldV: unknown, newV: unknown): { field: string; before?: string; after?: string }[] {
  const o = (oldV && typeof oldV === 'object' ? oldV : {}) as Record<string, unknown>;
  const n = (newV && typeof newV === 'object' ? newV : {}) as Record<string, unknown>;
  // Caso especial: matriz de permisos { changed: [...] }
  if (Array.isArray((n as Record<string, unknown>).changed) || Array.isArray((o as Record<string, unknown>).changed)) {
    const count = ((n.changed as unknown[]) ?? (o.changed as unknown[]) ?? []).length;
    return [{ field: 'Permisos', after: `${count} permiso(s) modificado(s)` }];
  }
  const keys = Array.from(new Set([...Object.keys(o), ...Object.keys(n)]));
  return keys.map((k) => ({
    field: FIELD_LABEL[k] ?? k,
    before: k in o ? fmt(o[k]) : undefined,
    after: k in n ? fmt(n[k]) : undefined,
  }));
}

export default function AuditPage() {
  const { can } = useAuth();
  const [userId, setUserId] = useState('');
  const [entityType, setEntityType] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);

  const { data: users } = useUsers();
  const q = new URLSearchParams({ page: String(page), pageSize: '20' });
  if (userId) q.set('userId', userId);
  if (entityType) q.set('entityType', entityType);
  if (from) q.set('from', new Date(from).toISOString());
  if (to) q.set('to', new Date(to).toISOString());
  const { data, isLoading, isError, refetch } = useAudit(q.toString());
  const canFilterUser = can('gestionar_usuarios');

  const exportCsv = async () => {
    const eq = new URLSearchParams();
    if (userId) eq.set('userId', userId);
    if (entityType) eq.set('entityType', entityType);
    if (from) eq.set('from', new Date(from).toISOString());
    if (to) eq.set('to', new Date(to).toISOString());
    setExporting(true);
    try {
      await apiDownload(`/admin/audit/export${eq.toString() ? `?${eq}` : ''}`, 'auditoria.csv');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo exportar');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div>
      <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl tracking-wide text-txt-primary">Auditoría</h1>
        <button className="btn-secondary inline-flex items-center gap-1.5 whitespace-nowrap" onClick={exportCsv} disabled={exporting}>
          <Download className="h-4 w-4" /> Exportar CSV
        </button>
      </div>
      <p className="mb-4 text-sm text-txt-muted">Historial de cambios del sistema.</p>

      <div className="card mb-4 grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-4">
        {canFilterUser && (
          <label className="text-xs text-txt-muted">Usuario
            <select className="input mt-1" value={userId} onChange={(e) => { setUserId(e.target.value); setPage(1); }}>
              <option value="">Todos</option>
              {users?.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </label>
        )}
        <label className="text-xs text-txt-muted">Entidad
          <select className="input mt-1" value={entityType} onChange={(e) => { setEntityType(e.target.value); setPage(1); }}>
            <option value="">Todas</option>
            {ENTITY_TYPES.map((t) => <option key={t} value={t}>{ENTITY_LABEL[t]}</option>)}
          </select>
        </label>
        <label className="text-xs text-txt-muted">Desde
          <input type="date" className="input mt-1" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} />
        </label>
        <label className="text-xs text-txt-muted">Hasta
          <input type="date" className="input mt-1" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} />
        </label>
      </div>

      {isError ? <ErrorState message="No se pudo cargar la auditoría." onRetry={() => refetch()} />
        : isLoading ? <PageLoader />
        : data && data.items.length === 0 ? <EmptyState title="Sin registros" hint="No hay cambios para esos filtros." />
        : (
          <>
            <div className="card overflow-x-auto p-0">
              <table className="w-full min-w-[820px] text-sm">
                <thead>
                  <tr className="border-b border-base-border text-left text-xs font-semibold uppercase tracking-wide text-txt-muted">
                    <th className="p-3">Fecha</th>
                    <th className="p-3">Usuario</th>
                    <th className="p-3">Acción</th>
                    <th className="p-3">Entidad</th>
                    <th className="p-3">Cambios</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.items.map((a) => {
                    const changes = toChanges(a.oldValue, a.newValue);
                    return (
                      <tr key={a.id} className="border-b border-base-border/40 align-top odd:bg-base-void/40 hover:bg-base-border/20">
                        <td className="whitespace-nowrap p-3 text-xs text-txt-faint">{formatDateTime(a.createdAt)}</td>
                        <td className="p-3 text-txt-muted">
                          {a.user ? (
                            <>
                              <span className="text-txt-primary">{a.user.name}</span>
                              <span className="block text-xs text-txt-faint">{a.user.email}</span>
                            </>
                          ) : (
                            'Sistema / usuario eliminado'
                          )}
                        </td>
                        <td className="p-3 text-txt-primary">{ACTION_LABEL[a.action] ?? a.action}</td>
                        <td className="p-3 text-txt-muted">{ENTITY_LABEL[a.entityType] ?? a.entityType}</td>
                        <td className="p-3">
                          {changes.length === 0 ? (
                            <span className="text-txt-faint">—</span>
                          ) : (
                            <ul className="space-y-1">
                              {changes.map((c, i) => (
                                <li key={i} className="flex flex-wrap items-center gap-1.5">
                                  <span className="text-xs font-medium text-txt-faint">{c.field}:</span>
                                  {c.before !== undefined && <span className="text-txt-muted line-through">{c.before}</span>}
                                  {c.before !== undefined && c.after !== undefined && (
                                    <ArrowRight className="h-3 w-3 shrink-0 text-txt-faint" />
                                  )}
                                  {c.after !== undefined && <span className="text-txt-primary">{c.after}</span>}
                                </li>
                              ))}
                            </ul>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {data && (
              <Pagination page={data.page} totalPages={data.totalPages} onPrev={() => setPage((p) => p - 1)} onNext={() => setPage((p) => p + 1)} />
            )}
          </>
        )}
    </div>
  );
}
