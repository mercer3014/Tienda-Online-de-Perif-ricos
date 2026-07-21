import { Link } from 'react-router-dom';
import type { ProductListItemDTO } from '@villano/shared-types';
import { formatBs } from '../lib/format';
import { ProductImg, StockBadge } from './ui';

export function ProductCard({ product }: { product: ProductListItemDTO }) {
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
      </div>
      <div className="flex flex-1 flex-col p-3">
        {product.brand && (
          <span className="text-xs uppercase tracking-wide text-txt-faint">{product.brand}</span>
        )}
        <h3 className="line-clamp-2 flex-1 text-sm font-semibold text-txt-primary group-hover:text-neon-purple-bright">
          {product.name}
        </h3>
        <div className="mt-2 flex items-baseline gap-1">
          <span className="text-xs text-txt-faint">desde</span>
          <span className="font-display text-lg font-bold text-neon-green">
            {formatBs(product.fromPrice)}
          </span>
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
