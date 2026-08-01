import { ShoppingCart } from 'lucide-react';
import { useCart } from '../store/cart';
import { formatBs } from '../lib/format';

/** Barra flotante inferior: aparece cuando hay items y el carrito esta cerrado. */
export function CartBar() {
  const count = useCart((s) => s.count());
  const total = useCart((s) => s.total());
  const isOpen = useCart((s) => s.isOpen);
  const open = useCart((s) => s.open);

  if (count === 0 || isOpen) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-base-border bg-base-black/95 px-4 py-3 backdrop-blur-md shadow-panel">
      <button
        onClick={open}
        className="mx-auto flex w-full max-w-7xl items-center gap-3 text-left"
        aria-label={`Ver carrito, ${count} articulos, total ${formatBs(total)}`}
      >
        <span className="relative inline-flex items-center justify-center rounded-full bg-neon-purple/15 p-2 text-neon-purple-bright">
          <ShoppingCart className="h-5 w-5" />
          <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-neon-green px-1 text-xs font-bold text-base-black">
            {count}
          </span>
        </span>
        <span className="text-sm text-txt-muted">
          {count} {count === 1 ? 'artículo' : 'artículos'}
        </span>
        <span className="ml-auto font-display text-lg font-bold text-neon-green">{formatBs(total)}</span>
        <span className="btn-accent py-2 text-sm">Ver carrito</span>
      </button>
    </div>
  );
}
