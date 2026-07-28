import { useEffect, useState } from 'react';
import { useRoles, useRolePermissionsMutation, type RoleMatrix } from '../hooks/admin';
import { toast } from '../lib/toast';
import { confirmAction } from '../lib/confirm';
import { ErrorState, PageLoader, Spinner } from '../components/shared';

export default function RolesPage() {
  const { data: roles, isLoading, isError, refetch } = useRoles();
  const save = useRolePermissionsMutation();
  // Estado local editable: roleId -> permissionId -> allowed
  const [draft, setDraft] = useState<Record<string, Record<string, boolean>>>({});

  useEffect(() => {
    if (!roles) return;
    const d: Record<string, Record<string, boolean>> = {};
    roles.forEach((r) => {
      d[r.id] = {};
      r.permissions.forEach((p) => { d[r.id][p.permissionId] = p.allowed; });
    });
    setDraft(d);
  }, [roles]);

  if (isError) return <ErrorState message="No se pudieron cargar los roles." onRetry={() => refetch()} />;
  if (isLoading || !roles) return <PageLoader />;

  const permissions = roles[0]?.permissions ?? [];

  const toggle = (roleId: string, permId: string) =>
    setDraft((d) => ({ ...d, [roleId]: { ...d[roleId], [permId]: !d[roleId]?.[permId] } }));

  const isDirty = (role: RoleMatrix) =>
    role.permissions.some((p) => draft[role.id]?.[p.permissionId] !== p.allowed);

  const saveRole = async (role: RoleMatrix) => {
    const ok = await confirmAction({
      title: `¿Guardar permisos de "${role.name}"?`,
      description: 'Los cambios se aplican de inmediato y afectan lo que ese rol puede hacer en el sistema.',
      confirmLabel: 'Guardar permisos',
    });
    if (!ok) return;
    const entries = role.permissions.map((p) => ({ permissionId: p.permissionId, allowed: draft[role.id]?.[p.permissionId] ?? false }));
    save.mutate({ id: role.id, body: { entries } }, {
      onSuccess: () => toast.success(`Permisos de "${role.name}" actualizados`),
      onError: (e) => toast.error(e instanceof Error ? e.message : 'Error'),
    });
  };

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h1 className="font-display text-2xl tracking-wide text-txt-primary">Roles y permisos</h1>
        {save.isPending && <Spinner />}
      </div>
      <p className="mb-4 text-sm text-txt-muted">
        Marcá qué puede hacer cada rol. Los cambios se aplican de inmediato en el backend.
      </p>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 bg-base-black p-2 text-left text-xs uppercase tracking-wide text-txt-faint">Permiso</th>
              {roles.map((r) => (
                <th key={r.id} className="p-2 text-center text-xs">
                  <div className="font-semibold text-txt-primary">{r.name}</div>
                  <div className="font-normal text-txt-faint">{r.userCount} usuario(s)</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {permissions.map((perm) => (
              <tr key={perm.permissionId} className="border-t border-base-border/50">
                <td className="sticky left-0 bg-base-black p-2">
                  <div className="font-mono text-xs text-neon-purple-bright">{perm.key}</div>
                  <div className="text-xs text-txt-faint">{perm.description}</div>
                </td>
                {roles.map((r) => (
                  <td key={r.id} className="p-2 text-center">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-neon-green"
                      checked={draft[r.id]?.[perm.permissionId] ?? false}
                      onChange={() => toggle(r.id, perm.permissionId)}
                      aria-label={`${perm.key} para ${r.name}`}
                    />
                  </td>
                ))}
              </tr>
            ))}
            <tr className="border-t border-base-border">
              <td className="sticky left-0 bg-base-black p-2" />
              {roles.map((r) => (
                <td key={r.id} className="p-2 text-center">
                  <button className="btn-accent px-2 py-1 text-xs disabled:opacity-40" disabled={!isDirty(r) || save.isPending} onClick={() => saveRole(r)}>
                    Guardar
                  </button>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
