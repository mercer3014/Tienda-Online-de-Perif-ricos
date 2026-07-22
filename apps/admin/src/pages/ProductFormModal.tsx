import { useEffect, useRef, useState } from 'react';
import { Star, X } from 'lucide-react';
import {
  createProductSchema,
  createVariantSchema,
  type ProductDetailDTO,
} from '@villano/shared-types';
import {
  useAdminAttributes,
  useAdminCategoryTree,
  useAdminProduct,
  useImageMutations,
  useProductMutations,
  useVariantMutations,
} from '../hooks/admin';
import { useAuth } from '../store/auth';
import { assetUrl } from '../lib/api';
import { formatBs } from '../lib/format';
import { toast } from '../lib/toast';
import { Field, Modal, Spinner } from '../components/ui';
import type { CategoryNode } from '@villano/shared-types';

function flattenCats(nodes: CategoryNode[], depth = 0): { id: string; label: string }[] {
  return nodes.flatMap((n) => [
    { id: n.id, label: `${'— '.repeat(depth)}${n.name}` },
    ...flattenCats(n.children, depth + 1),
  ]);
}

const slugify = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

export function ProductFormModal({ productId, onClose }: { productId: string | null; onClose: () => void }) {
  const isEdit = !!productId;
  const { can } = useAuth();
  const { data: existing, isLoading } = useAdminProduct(productId);
  const { data: cats } = useAdminCategoryTree();
  const { create, update } = useProductMutations();

  const [form, setForm] = useState({ categoryId: '', name: '', slug: '', description: '', brand: '', basePrice: '', originalPrice: '', status: 'activo' as 'activo' | 'inactivo' });
  const [slugTouched, setSlugTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (existing) {
      setForm({
        categoryId: existing.categoryId, name: existing.name, slug: existing.slug,
        description: existing.description ?? '', brand: existing.brand ?? '',
        basePrice: String(existing.basePrice),
        originalPrice: existing.originalPrice != null ? String(existing.originalPrice) : '',
        status: existing.status,
      });
      setSlugTouched(true);
    }
  }, [existing]);

  const set = (k: keyof typeof form, v: string) =>
    setForm((f) => ({ ...f, [k]: v, ...(k === 'name' && !slugTouched ? { slug: slugify(v) } : {}) }));

  const submit = async () => {
    setError(null);
    const payload = {
      categoryId: form.categoryId, name: form.name, slug: form.slug,
      description: form.description, brand: form.brand || undefined,
      basePrice: Number(form.basePrice),
      originalPrice: form.originalPrice ? Number(form.originalPrice) : null,
      status: form.status,
    };
    const parsed = createProductSchema.safeParse(payload);
    if (!parsed.success) { setError(parsed.error.errors[0]?.message ?? 'Datos invalidos'); return; }
    try {
      if (isEdit) { await update.mutateAsync({ id: productId!, body: parsed.data }); toast.success('Producto actualizado'); }
      else { const p = await create.mutateAsync(parsed.data); toast.success('Producto creado'); onClose(); return void p; }
    } catch (e) { setError(e instanceof Error ? e.message : 'Error al guardar'); }
  };

  const catOptions = cats ? flattenCats(cats) : [];
  const saving = create.isPending || update.isPending;

  return (
    <Modal title={isEdit ? 'Editar producto' : 'Nuevo producto'} onClose={onClose} wide>
      {isEdit && isLoading ? (
        <div className="flex justify-center py-10"><Spinner /></div>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nombre">
              <input className="input" value={form.name} onChange={(e) => set('name', e.target.value)} />
            </Field>
            <Field label="Slug (URL)">
              <input className="input" value={form.slug} onChange={(e) => { setSlugTouched(true); set('slug', e.target.value); }} />
            </Field>
            <Field label="Categoria">
              <select className="input" value={form.categoryId} onChange={(e) => set('categoryId', e.target.value)}>
                <option value="">Selecciona…</option>
                {catOptions.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </Field>
            <Field label="Marca">
              <input className="input" value={form.brand} onChange={(e) => set('brand', e.target.value)} />
            </Field>
            <Field label="Precio actual (Bs.)">
              <input className="input" type="number" value={form.basePrice} onChange={(e) => set('basePrice', e.target.value)} />
            </Field>
            <Field label="Precio antes / oferta (opcional)" hint="Si es mayor al actual, se muestra tachado con el % de descuento.">
              <input className="input" type="number" value={form.originalPrice} onChange={(e) => set('originalPrice', e.target.value)} placeholder="Sin oferta" />
            </Field>
            <Field label="Estado">
              <select className="input" value={form.status} onChange={(e) => set('status', e.target.value)}>
                <option value="activo">Activo</option>
                <option value="inactivo">Inactivo</option>
              </select>
            </Field>
          </div>
          <Field label="Descripcion">
            <textarea className="input min-h-20" value={form.description} onChange={(e) => set('description', e.target.value)} />
          </Field>

          {error && <p className="rounded bg-status-out/10 px-3 py-2 text-sm text-status-out" role="alert">{error}</p>}

          <div className="flex justify-end gap-2">
            <button className="btn-secondary" onClick={onClose}>Cancelar</button>
            <button className="btn-primary" onClick={submit} disabled={saving}>
              {saving ? <><Spinner className="h-4 w-4" /> Guardando…</> : 'Guardar'}
            </button>
          </div>

          {/* Variantes e imagenes solo tras crear (necesitan el id). */}
          {isEdit && existing && (
            <>
              {can('gestionar_imagenes') && <ImagesSection product={existing} />}
              {(can('editar_producto') || can('editar_stock')) && <VariantsSection product={existing} />}
            </>
          )}
        </div>
      )}
    </Modal>
  );
}

// ------------------------------- Imagenes ----------------------------------
function ImagesSection({ product }: { product: ProductDetailDTO }) {
  const { upload, setPrimary, remove } = useImageMutations(product.id);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;
    for (const file of Array.from(files)) {
      try { await upload.mutateAsync({ id: product.id, file }); toast.success('Imagen subida'); }
      catch (e) { toast.error(e instanceof Error ? e.message : 'Error al subir'); }
    }
  };

  return (
    <section className="border-t border-base-border pt-4">
      <h3 className="mb-2 font-display text-sm uppercase tracking-wide text-neon-purple-bright">Imagenes</h3>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
        className={`mb-3 flex cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed p-6 text-center text-sm ${dragging ? 'border-neon-green bg-neon-green/5' : 'border-base-border text-txt-muted'}`}
      >
        {upload.isPending ? <Spinner /> : <>Arrastra imagenes aqui o haz clic para subir<br /><span className="text-xs text-txt-faint">Se convierten a WebP automaticamente</span></>}
        <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
      </div>
      <div className="flex flex-wrap gap-2">
        {product.images.map((img) => (
          <div key={img.id} className="relative">
            <img src={assetUrl(img.urlWebp)} alt="" className={`h-20 w-20 rounded object-cover ${img.isPrimary ? 'ring-2 ring-neon-green' : ''}`} />
            <div className="absolute inset-x-0 bottom-0 flex justify-between bg-black/70 px-1 text-[10px]">
              {!img.isPrimary && <button onClick={() => setPrimary.mutate(img.id)} className="text-neon-green">Principal</button>}
              {img.isPrimary && <Star className="h-3 w-3 text-neon-green fill-neon-green" />}
              <button onClick={() => remove.mutate(img.id)} className="text-status-out" aria-label="Eliminar imagen"><X className="h-3 w-3" /></button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ------------------------------- Variantes ---------------------------------
function VariantsSection({ product }: { product: ProductDetailDTO }) {
  const { can } = useAuth();
  const { create, quick, remove } = useVariantMutations(product.id);
  const { data: attributes } = useAdminAttributes();
  const [adding, setAdding] = useState(false);
  const [newV, setNewV] = useState({ sku: '', price: '', stockQuantity: '', attributeValueIds: [] as string[] });

  const addVariant = async () => {
    const payload = { sku: newV.sku, price: Number(newV.price), stockQuantity: Number(newV.stockQuantity), attributeValueIds: newV.attributeValueIds };
    const parsed = createVariantSchema.safeParse(payload);
    if (!parsed.success) { toast.error(parsed.error.errors[0]?.message ?? 'Datos invalidos'); return; }
    try { await create.mutateAsync({ id: product.id, body: parsed.data }); toast.success('Variante agregada'); setNewV({ sku: '', price: '', stockQuantity: '', attributeValueIds: [] }); setAdding(false); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Error'); }
  };

  const saveQuick = async (id: string, price: number, stock: number) => {
    try { await quick.mutateAsync({ id, body: { price, stockQuantity: stock } }); toast.success('Actualizado'); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Error'); }
  };

  return (
    <section className="border-t border-base-border pt-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-display text-sm uppercase tracking-wide text-neon-purple-bright">Variantes</h3>
        {can('editar_producto') && <button className="text-sm text-neon-green hover:underline" onClick={() => setAdding((a) => !a)}>+ Agregar</button>}
      </div>

      <div className="space-y-2">
        {product.variants.map((v) => (
          <QuickVariantRow key={v.id} sku={v.sku} label={v.attributes.map((a) => a.value).join(' / ')} price={v.price} stock={v.stockQuantity}
            canEdit={can('editar_stock')} canDelete={can('editar_producto')}
            onSave={(p, s) => saveQuick(v.id, p, s)} onDelete={() => remove.mutate(v.id, { onSuccess: () => toast.success('Variante eliminada') })} />
        ))}
      </div>

      {adding && (
        <div className="card mt-3 space-y-2 p-3">
          <div className="grid grid-cols-3 gap-2">
            <input className="input" placeholder="SKU" value={newV.sku} onChange={(e) => setNewV({ ...newV, sku: e.target.value })} />
            <input className="input" type="number" placeholder="Precio" value={newV.price} onChange={(e) => setNewV({ ...newV, price: e.target.value })} />
            <input className="input" type="number" placeholder="Stock" value={newV.stockQuantity} onChange={(e) => setNewV({ ...newV, stockQuantity: e.target.value })} />
          </div>
          {attributes?.map((attr) => (
            <div key={attr.id} className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-txt-muted">{attr.name}:</span>
              {attr.values.map((val) => {
                const active = newV.attributeValueIds.includes(val.id);
                return (
                  <button key={val.id} onClick={() => setNewV((s) => ({ ...s, attributeValueIds: active ? s.attributeValueIds.filter((x) => x !== val.id) : [...s.attributeValueIds, val.id] }))}
                    className={`rounded-full border px-2 py-0.5 text-xs ${active ? 'border-neon-green bg-neon-green/15 text-neon-green' : 'border-base-border text-txt-muted'}`}>
                    {val.value}
                  </button>
                );
              })}
            </div>
          ))}
          <button className="btn-accent w-full py-1.5 text-sm" onClick={addVariant} disabled={create.isPending}>
            {create.isPending ? <Spinner className="h-4 w-4" /> : 'Guardar variante'}
          </button>
        </div>
      )}
    </section>
  );
}

function QuickVariantRow({ sku, label, price, stock, canEdit, canDelete, onSave, onDelete }: {
  sku: string; label: string; price: number; stock: number; canEdit: boolean; canDelete: boolean;
  onSave: (price: number, stock: number) => void; onDelete: () => void;
}) {
  const [p, setP] = useState(String(price));
  const [s, setS] = useState(String(stock));
  const dirty = Number(p) !== price || Number(s) !== stock;
  return (
    <div className="flex flex-wrap items-center gap-2 rounded border border-base-border p-2 text-sm">
      <div className="min-w-0 flex-1">
        <span className="font-mono text-xs text-txt-faint">{sku}</span>
        {label && <span className="ml-2 text-txt-muted">{label}</span>}
      </div>
      <label className="flex items-center gap-1 text-xs text-txt-faint">Bs.
        <input className="input w-24 py-1" type="number" value={p} onChange={(e) => setP(e.target.value)} disabled={!canEdit} />
      </label>
      <label className="flex items-center gap-1 text-xs text-txt-faint">Stock
        <input className="input w-20 py-1" type="number" value={s} onChange={(e) => setS(e.target.value)} disabled={!canEdit} />
      </label>
      {canEdit && dirty && <button className="btn-accent px-2 py-1 text-xs" onClick={() => onSave(Number(p), Number(s))}>Guardar</button>}
      {canDelete && <button className="text-status-out" onClick={onDelete} aria-label="Eliminar variante"><X className="h-4 w-4" /></button>}
      {!canEdit && <span className="text-xs text-txt-faint">{formatBs(price)}</span>}
    </div>
  );
}
