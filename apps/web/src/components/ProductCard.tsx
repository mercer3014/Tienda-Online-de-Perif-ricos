import { Link, useNavigate } from 'react-router-dom';
import { Bell, Check, ListPlus, Plus } from 'lucide-react';
import type { ProductListItemDTO } from '@villano/shared-types';
import { useCart } from '../store/cart';
import { trackEvent, useStoreStatus } from '../hooks/catalog';
import { buildNotifyWhatsappUrl } from '../lib/whatsapp';
import { formatBs } from '../lib/format';
import { ProductImg, StockBadge } from './ui';

export function ProductCard({ product }: { product: ProductListItemDTO }) {
  const navigate = useNavigate();
  const items = useCart((s) => s.items);
  const addItem = useCart((s) => s.addItem);
  const { data: storeStatus } = useStoreStatus();

  const onSale = product.originalPrice != null && product.originalPrice > product.fromPrice;
  const discount = onSale
    ? Math.round((1 - product.fromPrice / (product.originalPrice as number)) * 100)
    : 0;
  const outOfStock = product.aggregateStock === 'agotado';
  const needsOptions = product.variantCount > 1;
  const cartQty = product.defaultVariantId
    ? (items.find((i) => i.variantId === product.defaultVariantId)?.quantity ?? 0)
    : 0;

  const handleAdd = (e: React.MouseEvent) => {
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
  };

  const handleNotify = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!storeStatus) return;
    window.open(buildNotifyWhatsappUrl(storeStatus.whatsappNumber, product.name), '_blank', 'noopener');
  };

  return (
    <div className="card group flex flex-col overflow-hidden transition-transform hover:-translate-y-1 hover:shadow-neon-purple">
      <Link to={`/producto/${product.slug}`} className="flex flex-1 flex-col">
        <div className="relative aspect-square overflow-hidden bg-base-void">
          <ProductImg
            url={product.primaryImage}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <div className="absolute left-2 top-2">
            <StockBadge status={product.aggregateStock} />
          </div>
        </div>
        <div className="flex flex-1 flex-col p-3 pb-0">
          {product.brand && (
            <span className="text-xs uppercase tracking-wide text-txt-faint">{product.brand}</span>
          )}
          <h3 className="line-clamp-2 flex-1 text-sm font-semibold text-txt-primary group-hover:text-neon-purple-bright">
            {product.name}
          </h3>
          <div className="mt-2 flex flex-wrap items-baseline gap-x-2">
            <span className="font-display text-lg font-bold text-neon-green">
              {formatBs(product.fromPrice)}
            </span>
            {onSale && (
              <span className="text-xs text-txt-faint line-through">
                {formatBs(product.originalPrice as number)}
              </span>
            )}
            {onSale && (
              <span className="rounded-full bg-accent2 px-1.5 py-0.5 text-[11px] font-bold text-accent2-on">
                -{discount}%
              </span>
            )}
          </div>
        </div>
      </Link>

      <div className="p-3 pt-2">
        {outOfStock ? (
          <button
            onClick={handleNotify}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-base-border py-1.5 text-xs font-display font-semibold uppercase tracking-wide text-txt-muted transition-colors hover:border-neon-purple/60 hover:text-txt-primary"
          >
            <Bell className="h-3.5 w-3.5" /> Avisarme cuando llegue
          </button>
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
