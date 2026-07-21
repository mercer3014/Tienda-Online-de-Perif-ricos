import { useState } from 'react';
import type { CategoryNode } from '@villano/shared-types';
import { createCategorySchema } from '@villano/shared-types';
import { useAdminCategoryTree, useCategoryMutations } from '../hooks/admin';
import { useAuth } from '../store/auth';
import { toast } from '../lib/toast';
import { ErrorState, Field, PageLoader, Spinner } from '../components/shared';

const slugify = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

function flatten(nodes: CategoryNode[], depth = 0): { id: string; label: string }[] {
  return nodes.flatMap((n) => [{ id: n.id, label: `${'— '.repeat(depth)}${n.name}` }, ...flatten(n.children, depth + 1)]);
}

export default function CategoriesPage() {
  const { can } = useAuth();
  const { data: tree, isLoading, isError, refetch } = useAdminCategoryTree();
  const { create } = useCategoryMutations();
  const [form, setForm] = useState({ name: '', slug: '', parentId: '', isPromo: false, promoBadgeText: '' });
  const [err, setErr] = useState<string | null>(null);

  if (isError) return <ErrorState message="No se pudieron cargar las categorias." onRetry={() => refetch()} />;
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
    if (!parsed.success) { setErr(parsed.error.errors[0]?.message ?? 'Datos invalidos'); return; }
    try { await create.mutateAsync(parsed.data); toast.success('Categoria creada'); setForm({ name: '', slug: '', parentId: '', isPromo: false, promoBadgeText: '' }); }
    catch (e) { setErr(e instanceof Error ? e.message : 'Error'); }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <h1 className="mb-4 font-display text-2xl uppercase tracking-wide text-txt-primary">Categorias</h1>
        <div className="card p-4">
          {tree.length === 0 ? <p className="text-txt-muted">No hay categorias.</p> : (
            <ul className="space-y-1">{tree.map((n) => <CategoryRow key={n.id} node={n} allNodes={tree} depth={0} />)}</ul>
          )}
        </div>
      </div>

      {(can('crear_categoria')) && (
        <div>
          <h2 className="mb-4 font-display text-lg uppercase tracking-wide text-neon-purple-bright">Nueva categoria</h2>
          <div className="card space-y-3 p-4">
            <Field label="Nombre"><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value, slug: slugify(e.target.value) })} /></Field>
            <Field label="Slug"><input className="input" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} /></Field>
            <Field label="Categoria padre (opcional)">
              <select className="input" value={form.parentId} onChange={(e) => setForm({ ...form, parentId: e.target.value })}>
                <option value="">— Raiz —</option>
                {flatten(tree).map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </Field>
            <label className="flex items-center gap-2 text-sm text-txt-muted">
              <input type="checkbox" className="accent-neon-green" checked={form.isPromo} onChange={(e) => setForm({ ...form, isPromo: e.target.checked })} />
              Promocion especial (banner)
            </label>
            {form.isPromo && <Field label="Texto del badge"><input className="input" value={form.promoBadgeText} onChange={(e) => setForm({ ...form, promoBadgeText: e.target.value })} placeholder="PROMO" /></Field>}
            {err && <p className="rounded bg-status-out/10 px-3 py-2 text-sm text-status-out">{err}</p>}
            <button className="btn-primary w-full" onClick={submit} disabled={create.isPending}>
              {create.isPending ? <Spinner className="h-4 w-4" /> : 'Crear categoria'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function CategoryRow({ node, allNodes, depth }: { node: CategoryNode; allNodes: CategoryNode[]; depth: number }) {
  const { can } = useAuth();
  const { update, move, remove } = useCategoryMutations();
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

  const del = () => {
    if (!confirm(`Desactivar "${node.name}"?`)) return;
    remove.mutate(node.id, {
      onSuccess: () => toast.success('Categoria desactivada'),
      onError: (e) => toast.error(e instanceof Error ? e.message : 'No se pudo (tiene productos/subcategorias)'),
    });
  };

  const parentOptions = flatten(allNodes).filter((c) => c.id !== node.id);

  return (
    <li>
      <div className="flex flex-wrap items-center gap-2 rounded px-2 py-1.5 hover:bg-base-panel/50" style={{ marginLeft: depth * 16 }}>
        {editing ? (
          <>
            <input className="input w-48 py-1" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
            <button className="text-neon-green" onClick={rename}>✓</button>
            <button className="text-txt-faint" onClick={() => { setEditing(false); setName(node.name); }}>✕</button>
          </>
        ) : (
          <>
            <span className="font-medium text-txt-primary">{node.name}</span>
            {node.isPromo && <span className="rounded-full bg-neon-green/15 px-2 text-xs text-neon-green">{node.promoBadgeText ?? 'PROMO'}</span>}
            <span className="text-xs text-txt-faint">{node.productCount ?? 0} prod.</span>
            <div className="ml-auto flex items-center gap-2 text-xs">
              {can('editar_categoria') && <button className="text-neon-purple-bright hover:underline" onClick={() => setEditing(true)}>Renombrar</button>}
              {can('editar_categoria') && <button className="text-txt-muted hover:underline" onClick={togglePromo}>{node.isPromo ? 'Quitar promo' : 'Promo'}</button>}
              {can('modificar_categoria') && (
                <select className="rounded border border-base-border bg-base-void px-1 py-0.5 text-xs" value={node.parentId ?? ''} onChange={(e) => reparent(e.target.value)} aria-label="Mover a">
                  <option value="">Raiz</option>
                  {parentOptions.map((c) => <option key={c.id} value={c.id}>{c.label.trim()}</option>)}
                </select>
              )}
              {can('eliminar_categoria') && <button className="text-status-out hover:underline" onClick={del}>Eliminar</button>}
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
