import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { createUserSchema, updateUserSchema } from '@villano/shared-types';
import { useRoles, useUsers, useUserMutations, type AdminUser } from '../hooks/admin';
import { formatDateTime } from '../lib/format';
import { toast } from '../lib/toast';
import { confirmAction } from '../lib/confirm';
import { ActionIcon, EmptyState, ErrorState, Field, Modal, PageLoader, Spinner } from '../components/shared';

export default function UsersPage() {
  const { data: users, isLoading, isError, refetch } = useUsers();
  const { data: roles } = useRoles();
  const { remove } = useUserMutations();
  const [editing, setEditing] = useState<AdminUser | null | undefined>(undefined);

  const deactivate = async (u: AdminUser) => {
    const ok = await confirmAction({
      title: `¿Desactivar a ${u.name}?`,
      description: 'El usuario no podrá iniciar sesión en el panel. Podés reactivarlo editándolo.',
      confirmLabel: 'Desactivar',
      danger: true,
    });
    if (!ok) return;
    remove.mutate(u.id, {
      onSuccess: () => toast.success('Usuario desactivado'),
      onError: (e) => toast.error(e instanceof Error ? e.message : 'Error'),
    });
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-display text-2xl tracking-wide text-txt-primary">Usuarios</h1>
        <button className="btn-primary" onClick={() => setEditing(null)}>+ Nuevo usuario</button>
      </div>

      {isError ? <ErrorState message="No se pudieron cargar los usuarios." onRetry={() => refetch()} />
        : isLoading ? <PageLoader />
        : users && users.length === 0 ? <EmptyState title="Sin usuarios" />
        : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-base-border text-left text-xs uppercase tracking-wide text-txt-faint">
                  <th className="p-2">Nombre</th><th className="p-2">Email</th><th className="p-2">Rol</th><th className="p-2">Estado</th><th className="p-2">Creado</th><th className="p-2 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {users?.map((u) => (
                  <tr key={u.id} className="border-b border-base-border/40 odd:bg-base-void/40 hover:bg-base-border/20">
                    <td className="p-2 font-medium text-txt-primary">{u.name}</td>
                    <td className="p-2 text-txt-muted">{u.email}</td>
                    <td className="p-2 text-txt-muted">{u.role.name}</td>
                    <td className="p-2"><span className={u.active ? 'badge badge-success' : 'badge badge-danger'}>{u.active ? 'Activo' : 'Inactivo'}</span></td>
                    <td className="p-2 text-xs text-txt-faint">{formatDateTime(u.createdAt)}</td>
                    <td className="p-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <ActionIcon icon={Pencil} label="Editar usuario" onClick={() => setEditing(u)} />
                        {u.active && <ActionIcon icon={Trash2} label="Desactivar usuario" danger disabled={remove.isPending} onClick={() => deactivate(u)} />}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      {editing !== undefined && roles && <UserModal user={editing} roles={roles.map((r) => ({ id: r.id, name: r.name }))} onClose={() => setEditing(undefined)} />}
    </div>
  );
}

function UserModal({ user, roles, onClose }: { user: AdminUser | null; roles: { id: string; name: string }[]; onClose: () => void }) {
  const isEdit = !!user;
  const { create, update } = useUserMutations();
  const [form, setForm] = useState({ name: user?.name ?? '', email: user?.email ?? '', password: '', roleId: user?.role.id ?? '', active: user?.active ?? true });
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setErr(null);
    try {
      if (isEdit) {
        const body: Record<string, unknown> = { name: form.name, email: form.email, roleId: form.roleId, active: form.active };
        if (form.password) body.password = form.password;
        const parsed = updateUserSchema.safeParse(body);
        if (!parsed.success) { setErr(parsed.error.errors[0]?.message ?? 'Datos invalidos'); return; }
        await update.mutateAsync({ id: user!.id, body: parsed.data });
        toast.success('Usuario actualizado');
      } else {
        const parsed = createUserSchema.safeParse(form);
        if (!parsed.success) { setErr(parsed.error.errors[0]?.message ?? 'Datos invalidos'); return; }
        await create.mutateAsync(parsed.data);
        toast.success('Usuario creado');
      }
      onClose();
    } catch (e) { setErr(e instanceof Error ? e.message : 'Error'); }
  };

  const saving = create.isPending || update.isPending;
  return (
    <Modal title={isEdit ? 'Editar usuario' : 'Nuevo usuario'} onClose={onClose}>
      <div className="space-y-3">
        <Field label="Nombre"><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
        <Field label="Email"><input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
        <Field label={isEdit ? 'Nueva contrasena (opcional)' : 'Contrasena'}>
          <input className="input" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} autoComplete="new-password" />
        </Field>
        <Field label="Rol">
          <select className="input" value={form.roleId} onChange={(e) => setForm({ ...form, roleId: e.target.value })}>
            <option value="">Selecciona…</option>
            {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </Field>
        <label className="flex items-center gap-2 text-sm text-txt-muted">
          <input type="checkbox" className="accent-neon-green" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> Activo
        </label>
        {err && <p className="rounded bg-status-out/10 px-3 py-2 text-sm text-status-out">{err}</p>}
        <div className="flex justify-end gap-2">
          <button className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" onClick={submit} disabled={saving}>{saving ? <Spinner className="h-4 w-4" /> : 'Guardar'}</button>
        </div>
      </div>
    </Modal>
  );
}
