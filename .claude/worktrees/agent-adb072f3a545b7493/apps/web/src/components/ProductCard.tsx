import { Link } from 'react-router-dom';
import type { ProductListItemDTO } from '@villano/shared-types';
import { formatBs } from '../lib/format';
import { ProductImg, StockBadge } from './ui';

export function ProductCard({ product }: { product: ProductListItemDTO }) {
  const onSale = product.originalPrice != null && product.originalPrice > product.fromPrice;
  const discount = onSale
    ? Math.round((1 - product.fromPrice / (product.originalPrice as number)) * 100)
    : 0;

  return (
    <Link
      to={`/producto/${product.slug}`}
      className="card group flex flex-col overflow-hidden transition-transform hover:-translate-y-1 hover:shadow-neon-purple"
    >
      <div className="relative aspect-square overflow-hidden bg-base-void">
        <ProductImg
          url={product.primaryImage}
          alt={product.name}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <div className="absolute left-2 top-2">
          <StockBadge status={product.aggregateStock} />
        </div>
        {onSale && (
          <div className="absolute right-2 top-2 rounded-full bg-accent2 px-2 py-0.5 text-xs font-bold text-accent2-on shadow-neon-green">
            -{discount}%
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-3">
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
        </div>
      </div>
    </Link>
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
