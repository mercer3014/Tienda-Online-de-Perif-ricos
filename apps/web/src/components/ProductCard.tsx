import { Link, useNavigate } from 'react-router-dom';
import { Ban, Check, ListPlus, Plus } from 'lucide-react';
import type { ProductListItemDTO } from '@villano/shared-types';
import { useCart } from '../store/cart';
import { trackEvent } from '../hooks/catalog';
import { formatBs } from '../lib/format';
import { flyToCart } from '../lib/flyToCart';
import { useReveal } from '../lib/useReveal';
import { ProductImg } from './ui';

export function ProductCard({ product }: { product: ProductListItemDTO }) {
  const navigate = useNavigate();
  const items = useCart((s) => s.items);
  const addItem = useCart((s) => s.addItem);

  const onSale = product.originalPrice != null && product.originalPrice > product.fromPrice;
  const discount = onSale
    ? Math.round((1 - product.fromPrice / (product.originalPrice as number)) * 100)
    : 0;
  const outOfStock = product.aggregateStock === 'agotado';
  const needsOptions = product.variantCount > 1;
  const cartQty = product.defaultVariantId
    ? (items.find((i) => i.variantId === product.defaultVariantId)?.quantity ?? 0)
    : 0;
  // Desfasa el brillo de la foto por producto (determinístico via el id) para
  // que las tarjetas de una grilla no destellen todas en el mismo instante.
  const shineDelay = ((product.id.charCodeAt(0) + product.id.charCodeAt(product.id.length - 1)) % 5) * 1.1;

  const handleAdd = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (needsOptions || !product.defaultVariantId) {
      navigate(`/producto/${product.slug}`);
      return;
    }
    addItem(
      {
        variantId: product.defaultVariantId,
        productId: product.id,
        productSlug: product.slug,
        productName: product.name,
        variantLabel: '',
        unitPrice: product.fromPrice,
        image: product.primaryImage,
        maxStock: product.defaultVariantStock,
      },
      1,
      { openDrawer: false },
    );
    trackEvent(product.id, 'add_to_cart');
    flyToCart(e.currentTarget);
  };

  return (
    <div className="card group flex flex-col overflow-hidden transition-transform hover:-translate-y-1 hover:shadow-neon-purple">
      <Link to={`/producto/${product.slug}`} className="flex flex-1 flex-col">
        <div
          className="shine-surface relative aspect-square overflow-hidden bg-shot p-3"
          style={{ '--shine-delay': `${shineDelay}s` } as React.CSSProperties}
        >
          <ProductImg
            url={product.primaryImage}
            alt={product.name}
            className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105"
          />
        </div>
        <div className="flex flex-1 flex-col p-3 pb-0">
          {product.brand && (
            <span className="text-xs uppercase tracking-wide text-txt-faint">{product.brand}</span>
          )}
          <h3 className="line-clamp-2 flex-1 text-sm font-semibold text-txt-primary group-hover:text-neon-purple-bright">
            {product.name}
          </h3>
          <div className="mt-2 flex flex-wrap items-baseline gap-x-2">
            <span className="font-display text-lg font-bold text-txt-primary">
              {formatBs(product.fromPrice)}
            </span>
            {onSale && (
              <span className="text-xs text-txt-faint line-through">
                {formatBs(product.originalPrice as number)}
              </span>
            )}
            {onSale && (
              <span className="badge-pulse rounded-full border border-status-low/50 bg-status-low/10 px-1.5 py-0.5 text-[11px] font-bold text-status-low">
                -{discount}%
              </span>
            )}
          </div>
          {!outOfStock && !needsOptions && (
            <p className="mt-1 text-xs text-txt-faint">{product.defaultVariantStock} en stock</p>
          )}
        </div>
      </Link>

      <div className="p-3 pt-2">
        {outOfStock ? (
          <span className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-base-border bg-base-border/15 py-1.5 text-xs font-display font-semibold uppercase tracking-wide text-txt-muted">
            <Ban className="h-3.5 w-3.5" /> Agotado
          </span>
        ) : needsOptions ? (
          <button
            onClick={handleAdd}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-transparent bg-accent2 py-1.5 text-xs font-display font-semibold uppercase tracking-wide text-accent2-on transition-all hover:brightness-105"
          >
            <ListPlus className="h-3.5 w-3.5" /> Ver opciones
          </button>
        ) : (
          <button
            onClick={handleAdd}
            className={
              cartQty > 0
                ? 'inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-neon-green/50 bg-neon-green/15 py-1.5 text-xs font-display font-semibold uppercase tracking-wide text-neon-green'
                : 'inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-transparent bg-accent2 py-1.5 text-xs font-display font-semibold uppercase tracking-wide text-accent2-on transition-all hover:brightness-105'
            }
          >
            {cartQty > 0 ? (
              <>
                <Check className="h-3.5 w-3.5" /> Agregado · {cartQty}
              </>
            ) : (
              <>
                <Plus className="h-3.5 w-3.5" /> Agregar al pedido
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

/** ProductCard envuelta en el revelado por scroll (ver lib/useReveal.ts).
 * `index` escalona la entrada de una grilla para que no aparezca toda junta;
 * se repite cada 4 items (el ancho tipico de fila) para que el patron de
 * "cascada" se note en vez de ir acumulando un delay cada vez mas largo. */
export function RevealedProductCard({ product, index }: { product: ProductListItemDTO; index: number }) {
  const reveal = useReveal<HTMLDivElement>((index % 4) * 70);
  return (
    <div ref={reveal.ref} className={reveal.className} style={reveal.style}>
      <ProductCard product={product} />
    </div>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="card overflow-hidden">
      <div className="aspect-square skeleton" />
      <div className="space-y-2 p-3">
        <div className="skeleton h-3 w-1/3" />
        <div className="skeleton h-4 w-4/5" />
        <div className="skeleton h-5 w-1/2" />
      </div>
    </div>
  );
}
