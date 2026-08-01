import { useState } from 'react';
import { Check, X, Pencil, Trash2, Eye, EyeOff } from 'lucide-react';
import type { CategoryNode } from '@villano/shared-types';
import { createCategorySchema } from '@villano/shared-types';
import { useAdminCategoryTree, useCategoryMutations } from '../hooks/admin';
import { useAuth } from '../store/auth';
import { toast } from '../lib/toast';
import { ActionIcon, ErrorState, Field, PageLoader, Spinner } from '../components/shared';
import { confirmAction } from '../lib/confirm';
import { MSG_DATOS_INVALIDOS } from '../lib/format';

const slugify = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

function flatten(nodes: CategoryNode[], depth = 0): { id: string; label: string }[] {
  return nodes.flatMap((n) => [
    { id: n.id, label: `${depth > 0 ? '  '.repeat(depth) + '↳ ' : ''}${n.name}` },
    ...flatten(n.children, depth + 1),
  ]);
}

export default function CategoriesPage() {
  const { can } = useAuth();
  const { data: tree, isLoading, isError, refetch } = useAdminCategoryTree();
  const { create } = useCategoryMutations();
  const [form, setForm] = useState({ name: '', slug: '', parentId: '', isPromo: false, promoBadgeText: '' });
  const [err, setErr] = useState<string | null>(null);

  if (isError) return <ErrorState message="No se pudieron cargar las categorías." onRetry={() => refetch()} />;
  if (isLoading || !tree) return <PageLoader />;

  const submit = async () => {
    setErr(null);
    const payload = {
      name: form.name, slug: form.slug || slugify(form.name),
      parentId: form.parentId || undefined, isPromo: form.isPromo,
      promoBadgeText: form.isPromo ? form.promoBadgeText || 'PROMO' : undefined,
      displayOrder: 0,
    };
    const parsed = createCategorySchema.safeParse(payload);
    if (!parsed.success) { setErr(parsed.error.errors[0]?.message ?? MSG_DATOS_INVALIDOS); return; }
    try { await create.mutateAsync(parsed.data); toast.success('Categoría creada'); setForm({ name: '', slug: '', parentId: '', isPromo: false, promoBadgeText: '' }); }
    catch (e) { setErr(e instanceof Error ? e.message : 'Error'); }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <h1 className="mb-4 font-display text-2xl tracking-wide text-txt-primary">Categorías</h1>
        <div className="card p-4">
          {tree.length === 0 ? <p className="text-txt-muted">No hay categorías.</p> : (
            <ul className="space-y-1">{tree.map((n) => <CategoryRow key={n.id} node={n} allNodes={tree} depth={0} />)}</ul>
          )}
        </div>
      </div>

      {(can('crear_categoria')) && (
        <div>
          <h2 className="mb-4 font-display text-lg uppercase tracking-wide text-neon-purple-bright">Nueva categoría</h2>
          <div className="card space-y-3 p-4">
            <Field label="Nombre"><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value, slug: slugify(e.target.value) })} /></Field>
            <Field label="Slug"><input className="input" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} /></Field>
            <Field label="Categoría padre (opcional)">
              <select className="input" value={form.parentId} onChange={(e) => setForm({ ...form, parentId: e.target.value })}>
                <option value="">Sin categoría padre (raíz)</option>
                {flatten(tree).map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </Field>
            <label className="flex items-center gap-2 text-sm text-txt-muted">
              <input type="checkbox" className="accent-neon-green" checked={form.isPromo} onChange={(e) => setForm({ ...form, isPromo: e.target.checked })} />
              Promoción especial (banner)
            </label>
            {form.isPromo && <Field label="Texto del badge"><input className="input" value={form.promoBadgeText} onChange={(e) => setForm({ ...form, promoBadgeText: e.target.value })} placeholder="PROMO" /></Field>}
            {err && <p className="rounded bg-status-out/10 px-3 py-2 text-sm text-status-out">{err}</p>}
            <button className="btn-primary w-full" onClick={submit} disabled={create.isPending}>
              {create.isPending ? <Spinner className="h-4 w-4" /> : 'Crear categoría'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function CategoryRow({ node, allNodes, depth }: { node: CategoryNode; allNodes: CategoryNode[]; depth: number }) {
  const { can } = useAuth();
  const { update, move, remove, removePermanent } = useCategoryMutations();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(node.name);

  const rename = () => {
    if (name.trim() === node.name) { setEditing(false); return; }
    update.mutate({ id: node.id, body: { name: name.trim() } }, {
      onSuccess: () => { toast.success('Renombrada'); setEditing(false); },
      onError: (e) => toast.error(e instanceof Error ? e.message : 'Error'),
    });
  };

  const reparent = (parentId: string) =>
    move.mutate({ id: node.id, body: { parentId: parentId || null, displayOrder: node.displayOrder } }, {
      onSuccess: () => toast.success('Movida'),
      onError: (e) => toast.error(e instanceof Error ? e.message : 'Error'),
    });

  const togglePromo = () =>
    update.mutate({ id: node.id, body: { isPromo: !node.isPromo, promoBadgeText: !node.isPromo ? 'PROMO' : undefined } }, {
      onSuccess: () => toast.success('Actualizada'),
    });

  const hide = async () => {
    const ok = await confirmAction({
      title: `¿Ocultar "${node.name}" del catálogo público?`,
      description: 'El cliente ya no la va a ver en la tienda. La categoría sigue guardada en el sistema y podés volver a mostrarla cuando quieras. Solo se puede ocultar si no tiene productos ni subcategorías visibles.',
      confirmLabel: 'Ocultar del catálogo',
    });
    if (!ok) return;
    remove.mutate(node.id, {
      onSuccess: () => toast.success('Categoría oculta del catálogo'),
      onError: (e) => toast.error(e instanceof Error ? e.message : 'No se pudo (tiene productos/subcategorías visibles)'),
    });
  };

  const show = () =>
    update.mutate(
      { id: node.id, body: { active: true } },
      {
        onSuccess: () => toast.success('Categoría visible en el catálogo'),
        onError: (e) => toast.error(e instanceof Error ? e.message : 'Error'),
      },
    );

  const delPermanent = async () => {
    const ok = await confirmAction({
      title: `¿Eliminar "${node.name}" para siempre?`,
      description: 'Esto borra la categoría de la base de datos DEFINITIVAMENTE. No se puede deshacer. Solo se puede eliminar si no tiene productos ni subcategorías asociadas (movelos o eliminalos primero).',
      confirmLabel: 'Eliminar para siempre',
      danger: true,
    });
    if (!ok) return;
    removePermanent.mutate(node.id, {
      onSuccess: () => toast.success('Categoría eliminada permanentemente'),
      onError: (e) => toast.error(e instanceof Error ? e.message : 'No se pudo (tiene productos/subcategorías asociadas)'),
    });
  };

  const parentOptions = flatten(allNodes).filter((c) => c.id !== node.id);

  return (
    <li>
      <div className="flex flex-wrap items-center gap-2 rounded px-2 py-1.5 hover:bg-base-panel/50" style={{ marginLeft: depth * 16 }}>
        {editing ? (
          <>
            <input className="input w-48 py-1" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
            <button className="text-neon-green" onClick={rename} aria-label="Guardar"><Check className="h-4 w-4" /></button>
            <button className="text-txt-faint" onClick={() => { setEditing(false); setName(node.name); }} aria-label="Cancelar"><X className="h-4 w-4" /></button>
          </>
        ) : (
          <>
            <span className={`font-medium ${node.active ? 'text-txt-primary' : 'text-txt-faint line-through'}`}>{node.name}</span>
            {node.isPromo && <span className="rounded-full bg-neon-green/15 px-2 text-xs text-neon-green">{node.promoBadgeText ?? 'PROMO'}</span>}
            <span
              className={node.active ? 'badge badge-success' : 'badge badge-danger'}
              title={node.active ? 'Visible: los clientes la ven en el catálogo público' : 'Oculta: no aparece en el catálogo público, pero sigue guardada en el sistema'}
            >
              {node.active ? 'Visible' : 'Oculta'}
            </span>
            <span className="text-xs text-txt-faint">{node.productCount ?? 0} prod.</span>
            <div className="ml-auto flex items-center gap-2 text-xs">
              {node.active && (
                <>
                  {can('editar_categoria') && <ActionIcon icon={Pencil} label="Renombrar categoría" onClick={() => setEditing(true)} />}
                  {can('editar_categoria') && <button className="rounded px-2 py-1 text-xs text-txt-muted hover:bg-base-panel hover:text-txt-primary" onClick={togglePromo}>{node.isPromo ? 'Quitar promo' : 'Promo'}</button>}
                  {can('modificar_categoria') && (
                    <select className="rounded border border-base-border bg-base-void px-1 py-0.5 text-xs" value={node.parentId ?? ''} onChange={(e) => reparent(e.target.value)} aria-label="Mover a">
                      <option value="">Raíz</option>
                      {parentOptions.map((c) => <option key={c.id} value={c.id}>{c.label.trim()}</option>)}
                    </select>
                  )}
                </>
              )}
              {can('eliminar_categoria') && (
                node.active ? (
                  <ActionIcon icon={EyeOff} label="Ocultar del catálogo público" disabled={remove.isPending} onClick={hide} />
                ) : (
                  <ActionIcon icon={Eye} label="Mostrar en el catálogo público" disabled={update.isPending} onClick={show} />
                )
              )}
              {can('eliminar_categoria') && (
                <ActionIcon icon={Trash2} label="Eliminar para siempre" danger disabled={removePermanent.isPending} onClick={delPermanent} />
              )}
            </div>
          </>
        )}
      </div>
      {node.children.length > 0 && (
        <ul className="space-y-1">{node.children.map((c) => <CategoryRow key={c.id} node={c} allNodes={allNodes} depth={depth + 1} />)}</ul>
      )}
    </li>
  );
}
