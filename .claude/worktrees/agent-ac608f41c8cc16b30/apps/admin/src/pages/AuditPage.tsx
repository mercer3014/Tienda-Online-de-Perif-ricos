import { useState } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAudit, useUsers } from '../hooks/admin';
import { useAuth } from '../store/auth';
import { formatDateTime } from '../lib/format';
import { EmptyState, ErrorState, PageLoader } from '../components/shared';

const ENTITY_TYPES = ['product', 'variant', 'category', 'order', 'role', 'user'];

// Etiquetas legibles (en vez de claves crudas).
const ACTION_LABEL: Record<string, string> = {
  crear_producto: 'Creó un producto',
  editar_producto: 'Editó un producto',
  eliminar_producto: 'Desactivó un producto',
  editar_precio: 'Cambió un precio',
  editar_stock: 'Cambió el stock',
  crear_variante: 'Creó una variante',
  editar_variante: 'Editó una variante',
  eliminar_variante: 'Eliminó una variante',
  gestionar_imagenes: 'Gestionó imágenes',
  crear_categoria: 'Creó una categoría',
  modificar_categoria: 'Modificó una categoría',
  eliminar_categoria: 'Desactivó una categoría',
  cambiar_estado_pedido: 'Cambió el estado de un pedido',
  gestionar_roles: 'Actualizó permisos de un rol',
  gestionar_usuarios: 'Gestionó un usuario',
};
const ENTITY_LABEL: Record<string, string> = {
  product: 'Producto', variant: 'Variante', category: 'Categoría',
  order: 'Pedido', role: 'Rol', user: 'Usuario',
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

  const { data: users } = useUsers();
  const q = new URLSearchParams({ page: String(page), pageSize: '20' });
  if (userId) q.set('userId', userId);
  if (entityType) q.set('entityType', entityType);
  if (from) q.set('from', new Date(from).toISOString());
  if (to) q.set('to', new Date(to).toISOString());
  const { data, isLoading, isError, refetch } = useAudit(q.toString());
  const canFilterUser = can('gestionar_usuarios');

  return (
    <div>
      <h1 className="mb-1 font-display text-2xl tracking-wide text-txt-primary">Auditoría</h1>
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
            <div className="space-y-3">
              {data?.items.map((a) => {
                const changes = toChanges(a.oldValue, a.newValue);
                return (
                  <div key={a.id} className="card p-4">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <div className="min-w-0">
                        <span className="font-semibold text-txt-primary">{ACTION_LABEL[a.action] ?? a.action}</span>
                        <span className="badge badge-success ml-2 align-middle">{ENTITY_LABEL[a.entityType] ?? a.entityType}</span>
                      </div>
                      <span className="text-xs text-txt-faint">{formatDateTime(a.createdAt)}</span>
                    </div>
                    <p className="mt-0.5 text-xs text-txt-muted">
                      {a.user ? `${a.user.name} · ${a.user.email}` : 'Sistema / usuario eliminado'}
                    </p>

                    {changes.length > 0 && (
                      <ul className="mt-3 divide-y divide-base-border/60 rounded-md border border-base-border/60">
                        {changes.map((c, i) => (
                          <li key={i} className="grid grid-cols-[minmax(90px,140px)_1fr] items-center gap-2 px-3 py-1.5 text-sm">
                            <span className="text-xs font-medium uppercase tracking-wide text-txt-faint">{c.field}</span>
                            <span className="flex flex-wrap items-center gap-2">
                              {c.before !== undefined && (
                                <span className="rounded bg-status-out/10 px-2 py-0.5 text-status-out line-through decoration-status-out/40">
                                  {c.before}
                                </span>
                              )}
                              {c.before !== undefined && c.after !== undefined && (
                                <ArrowRight className="h-3.5 w-3.5 shrink-0 text-txt-faint" />
                              )}
                              {c.after !== undefined && (
                                <span className="rounded bg-status-stock/10 px-2 py-0.5 text-status-stock">{c.after}</span>
                              )}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>

            {data && data.totalPages > 1 && (
              <div className="mt-4 flex items-center justify-center gap-3 text-sm">
                <button className="btn-secondary py-1.5 inline-flex items-center gap-1" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}><ChevronLeft className="h-4 w-4" /> Anterior</button>
                <span className="text-txt-muted">Página {data.page} de {data.totalPages}</span>
                <button className="btn-secondary py-1.5 inline-flex items-center gap-1" disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)}>Siguiente <ChevronRight className="h-4 w-4" /></button>
              </div>
            )}
          </>
        )}
    </div>
  );
}
