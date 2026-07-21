import { useState } from 'react';
import { useAudit, useUsers } from '../hooks/admin';
import { useAuth } from '../store/auth';
import { formatDateTime } from '../lib/format';
import { EmptyState, ErrorState, PageLoader } from '../components/shared';

const ENTITY_TYPES = ['product', 'variant', 'category', 'order', 'role', 'user'];

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
      <h1 className="mb-4 font-display text-2xl uppercase tracking-wide text-txt-primary">Auditoria</h1>

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
            {ENTITY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
        <label className="text-xs text-txt-muted">Desde
          <input type="date" className="input mt-1" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} />
        </label>
        <label className="text-xs text-txt-muted">Hasta
          <input type="date" className="input mt-1" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} />
        </label>
      </div>

      {isError ? <ErrorState message="No se pudo cargar la auditoria." onRetry={() => refetch()} />
        : isLoading ? <PageLoader />
        : data && data.items.length === 0 ? <EmptyState title="Sin registros" hint="No hay cambios para esos filtros." />
        : (
          <>
            <div className="space-y-2">
              {data?.items.map((a) => (
                <div key={a.id} className="card p-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded bg-neon-purple/15 px-2 py-0.5 text-xs font-semibold text-neon-purple-bright">{a.action}</span>
                    <span className="text-xs text-txt-faint">{a.entityType}</span>
                    <span className="ml-auto text-xs text-txt-faint">{formatDateTime(a.createdAt)}</span>
                  </div>
                  <p className="mt-1 text-xs text-txt-muted">Por: {a.user ? `${a.user.name} (${a.user.email})` : 'Sistema/usuario eliminado'}</p>
                  {Boolean(a.oldValue || a.newValue) && (
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      {a.oldValue ? <pre className="overflow-x-auto rounded bg-base-void p-2 text-[11px] text-status-out/80">antes: {JSON.stringify(a.oldValue)}</pre> : <span />}
                      {a.newValue ? <pre className="overflow-x-auto rounded bg-base-void p-2 text-[11px] text-status-stock/80">despues: {JSON.stringify(a.newValue)}</pre> : <span />}
                    </div>
                  )}
                </div>
              ))}
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
    </div>
  );
}
