import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { createAttributeSchema, createAttributeValueSchema } from '@villano/shared-types';
import { useAdminAttributes, useAttributeMutations, type AttributeDTO } from '../hooks/admin';
import { useAuth } from '../store/auth';
import { toast } from '../lib/toast';
import { ActionIcon, ErrorState, Field, PageLoader, Spinner } from '../components/shared';
import { confirmAction } from '../lib/confirm';

export default function AttributesPage() {
  const { can } = useAuth();
  const { data: attributes, isLoading, isError, refetch } = useAdminAttributes();
  const { create } = useAttributeMutations();
  const [name, setName] = useState('');
  const [err, setErr] = useState<string | null>(null);

  if (isError) return <ErrorState message="No se pudieron cargar los atributos." onRetry={() => refetch()} />;
  if (isLoading || !attributes) return <PageLoader />;

  const submit = async () => {
    setErr(null);
    const parsed = createAttributeSchema.safeParse({ name });
    if (!parsed.success) { setErr(parsed.error.errors[0]?.message ?? 'Datos invalidos'); return; }
    try {
      await create.mutateAsync(parsed.data);
      toast.success('Atributo creado');
      setName('');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Error');
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <h1 className="mb-4 font-display text-2xl tracking-wide text-txt-primary">Atributos</h1>
        {attributes.length === 0 ? (
          <div className="card p-4"><p className="text-txt-muted">No hay atributos todavia.</p></div>
        ) : (
          <div className="space-y-4">
            {attributes.map((a) => <AttributeCard key={a.id} attribute={a} />)}
          </div>
        )}
      </div>

      {can('crear_producto') && (
        <div>
          <h2 className="mb-4 font-display text-lg uppercase tracking-wide text-neon-purple-bright">Nuevo atributo</h2>
          <div className="card space-y-3 p-4">
            <Field label="Nombre" hint="Ej. Tipo de switch, Color, Conectividad">
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            {err && <p className="rounded bg-status-out/10 px-3 py-2 text-sm text-status-out">{err}</p>}
            <button className="btn-primary w-full" onClick={submit} disabled={create.isPending}>
              {create.isPending ? <Spinner className="h-4 w-4" /> : 'Crear atributo'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function AttributeCard({ attribute }: { attribute: AttributeDTO }) {
  const { can } = useAuth();
  const { remove, createValue, removeValue } = useAttributeMutations();
  const [newValue, setNewValue] = useState('');
  const [valueErr, setValueErr] = useState<string | null>(null);

  const addValue = async () => {
    setValueErr(null);
    const parsed = createAttributeValueSchema.safeParse({ value: newValue });
    if (!parsed.success) { setValueErr(parsed.error.errors[0]?.message ?? 'Dato invalido'); return; }
    try {
      await createValue.mutateAsync({ attributeId: attribute.id, body: parsed.data });
      toast.success('Valor agregado');
      setNewValue('');
    } catch (e) {
      setValueErr(e instanceof Error ? e.message : 'Error');
    }
  };

  const delAttribute = async () => {
    const ok = await confirmAction({
      title: `¿Eliminar el atributo "${attribute.name}"?`,
      description: 'Se eliminan tambien todos sus valores. Solo se puede eliminar si ningun valor esta en uso por una variante existente.',
      confirmLabel: 'Eliminar',
      danger: true,
    });
    if (!ok) return;
    remove.mutate(attribute.id, {
      onSuccess: () => toast.success('Atributo eliminado'),
      onError: (e) => toast.error(e instanceof Error ? e.message : 'No se pudo eliminar (tiene valores en uso)'),
    });
  };

  const delValue = async (valueId: string, value: string) => {
    const ok = await confirmAction({
      title: `¿Eliminar el valor "${value}"?`,
      description: 'Solo se puede eliminar si no esta en uso por ninguna variante existente.',
      confirmLabel: 'Eliminar',
      danger: true,
    });
    if (!ok) return;
    removeValue.mutate(valueId, {
      onSuccess: () => toast.success('Valor eliminado'),
      onError: (e) => toast.error(e instanceof Error ? e.message : 'No se pudo eliminar (esta en uso)'),
    });
  };

  return (
    <div className="card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-display text-base text-txt-primary">{attribute.name}</h3>
        {can('crear_producto') && (
          <ActionIcon icon={Trash2} label="Eliminar atributo" danger disabled={remove.isPending} onClick={delAttribute} />
        )}
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        {attribute.values.length === 0 && <span className="text-sm text-txt-faint">Sin valores todavia.</span>}
        {attribute.values.map((v) => (
          <span key={v.id} className="badge inline-flex items-center gap-1.5 border-base-border bg-base-void text-txt-primary">
            {v.value}
            {can('crear_producto') && (
              <button
                type="button"
                onClick={() => delValue(v.id, v.value)}
                title={`Eliminar valor "${v.value}"`}
                aria-label={`Eliminar valor "${v.value}"`}
                className="text-txt-faint hover:text-status-out"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            )}
          </span>
        ))}
      </div>

      {can('crear_producto') && (
        <div className="flex flex-wrap items-start gap-2">
          <input
            className="input w-48 py-1"
            placeholder="Nuevo valor"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') addValue(); }}
          />
          <button className="btn-secondary py-1" onClick={addValue} disabled={createValue.isPending}>
            {createValue.isPending ? <Spinner className="h-4 w-4" /> : 'Agregar valor'}
          </button>
          {valueErr && <p className="w-full text-sm text-status-out">{valueErr}</p>}
        </div>
      )}
    </div>
  );
}
