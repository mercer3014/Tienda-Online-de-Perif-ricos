import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, X, Minus, Plus, MessageSquare, Trash2 } from 'lucide-react';
import { useCart } from '../store/cart';
import { useCreateOrder, markWhatsappSent, trackEvent } from '../hooks/catalog';
import { formatBs } from '../lib/format';
import { ProductImg, Spinner } from './ui';
import { useDismissable } from '../lib/useDismissable';

export function CartDrawer() {
  const { items, isOpen, close, removeItem, setQuantity, clear, total } = useCart();
  // Escape cierra el carrito y se bloquea el scroll del fondo mientras esta abierto.
  useDismissable(isOpen, close);
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const createOrder = useCreateOrder();

  const finalize = async () => {
    setError(null);
    try {
      const payload = {
        customerPhone: phone.trim() || undefined,
        items: items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })),
      };
      const res = await createOrder.mutateAsync(payload);
      items.forEach((i) => trackEvent(i.productId, 'whatsapp_click'));
      await markWhatsappSent(res.order.id);
      // Abrir WhatsApp con el mensaje pre-armado.
      window.open(res.whatsappUrl, '_blank', 'noopener');
      clear();
      close();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo generar el pedido. Intenta nuevamente.');
    }
  };

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 z-50 bg-black/70 transition-opacity ${isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
        onClick={close}
        aria-hidden
      />
      <aside
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-base-border bg-base-graphite shadow-panel transition-transform duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
        role="dialog"
        aria-label="Carrito de compras"
        aria-hidden={!isOpen}
      >
        <div className="flex items-center justify-between border-b border-base-border p-4">
          <h2 className="inline-flex items-center gap-2 font-display text-lg uppercase tracking-wider text-neon-purple-bright">
            <ShoppingBag className="h-5 w-5 text-neon-purple" /> Tu carrito
          </h2>
          <button onClick={close} className="rounded p-1 text-txt-muted hover:text-neon-purple" aria-label="Cerrar carrito">
            <X className="h-5 w-5" />
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
            <ShoppingBag className="h-16 w-16 text-txt-faint opacity-40" />
            <p className="text-txt-muted">Tu carrito está vacío.</p>
            <Link to="/catalogo" onClick={close} className="btn-primary">
              Ver catalogo
            </Link>
          </div>
        ) : (
          <>
            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {items.map((i) => (
                <div key={i.variantId} className="card flex gap-3 p-3">
                  <ProductImg url={i.image} alt={i.productName} className="h-16 w-16 shrink-0 rounded object-cover" />
                  <div className="min-w-0 flex-1">
                    <Link to={`/producto/${i.productSlug}`} onClick={close} className="line-clamp-2 text-sm font-semibold hover:text-neon-purple-bright">
                      {i.productName}
                    </Link>
                    {i.variantLabel && <p className="text-xs text-txt-faint">{i.variantLabel}</p>}
                    <p className="text-sm text-neon-green">{formatBs(i.unitPrice)}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <div className="flex items-center rounded border border-base-border">
                        <button className="p-1 text-txt-muted hover:text-neon-purple" onClick={() => setQuantity(i.variantId, i.quantity - 1)} aria-label="Disminuir">
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-8 text-center text-sm">{i.quantity}</span>
                        <button className="p-1 text-txt-muted hover:text-neon-purple disabled:opacity-40" onClick={() => setQuantity(i.variantId, i.quantity + 1)} disabled={i.quantity >= i.maxStock} aria-label="Aumentar">
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <button className="ml-auto inline-flex items-center gap-1 text-xs text-status-out hover:underline" onClick={() => removeItem(i.variantId)}>
                        <Trash2 className="h-3.5 w-3.5" /> Quitar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-base-border p-4">
              <label className="mb-1 block text-xs text-txt-muted" htmlFor="phone">
                Tu teléfono (opcional)
              </label>
              <input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Ej. 700 12345"
                className="mb-3 w-full rounded-md border border-base-border bg-base-void px-3 py-2 text-sm"
                inputMode="tel"
              />
              <div className="mb-3 flex items-center justify-between">
                <span className="text-txt-muted">Total</span>
                <span className="font-display text-xl font-bold text-neon-green">{formatBs(total())}</span>
              </div>
              {error && (
                <p className="mb-2 rounded bg-status-out/10 px-3 py-2 text-sm text-status-out" role="alert">
                  {error}
                </p>
              )}
              <button
                onClick={finalize}
                disabled={createOrder.isPending}
                className="btn-accent w-full py-3 text-base flex items-center justify-center gap-2"
              >
                {createOrder.isPending ? <><Spinner className="h-4 w-4" /> Generando…</> : <><MessageSquare className="h-5 w-5" /> Finalizar por WhatsApp</>}
              </button>
              <p className="mt-2 text-center text-xs text-txt-faint">
                Coordinamos pago y entrega por WhatsApp. Sin pago online.
              </p>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
