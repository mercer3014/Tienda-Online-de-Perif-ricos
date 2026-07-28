import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { computeStockStatus, type VariantDTO } from '@villano/shared-types';
import { ShoppingBag, Check } from 'lucide-react';
import { useProduct, trackEvent } from '../hooks/catalog';
import { useCart } from '../store/cart';
import { assetUrl } from '../lib/api';
import { formatBs } from '../lib/format';
import { ErrorState, ProductImg, Spinner, StockBadge } from '../components/ui';
import { usePageMeta } from '../components/Layout';

// Productos ya vistos en esta sesion del SPA (dedupe de la metrica 'view').
const viewedProducts = new Set<string>();

/** Setea/actualiza una meta tag OpenGraph. */
function setOg(property: string, content: string) {
  let tag = document.querySelector(`meta[property="${property}"]`);
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute('property', property);
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', content);
}

export default function ProductPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: product, isLoading, isError, refetch } = useProduct(slug);
  const addItem = useCart((s) => s.addItem);
  const [activeVariantId, setActiveVariantId] = useState<string | null>(null);
  const [activeImage, setActiveImage] = useState(0);
  const [added, setAdded] = useState(false);

  usePageMeta(product?.name ?? 'Producto');

  // Registrar vista y seleccionar variante por defecto (primera con stock).
  useEffect(() => {
    if (!product) return;
    // Dedupe: una sola vista por producto por sesion del SPA (evita dobles
    // registros por remontajes de React, p.ej. StrictMode en desarrollo).
    if (!viewedProducts.has(product.id)) {
      viewedProducts.add(product.id);
      trackEvent(product.id, 'view');
    }
    const firstAvailable = product.variants.find((v) => v.stockQuantity > 0) ?? product.variants[0];
    setActiveVariantId(firstAvailable?.id ?? null);
    setActiveImage(0);
  }, [product]);

  const activeVariant: VariantDTO | undefined = useMemo(
    () => product?.variants.find((v) => v.id === activeVariantId),
    [product, activeVariantId],
  );

  // OpenGraph dinamico para compartir por WhatsApp.
  useEffect(() => {
    if (!product) return;
    const price = activeVariant?.price ?? product.fromPrice;
    setOg('og:title', `${product.name} — ${formatBs(price)}`);
    setOg('og:type', 'product');
    if (product.images[activeImage]?.urlWebp || product.primaryImage) {
      setOg('og:image', assetUrl(product.images[activeImage]?.urlWebp ?? product.primaryImage));
    }
    setOg('og:description', product.description || 'Perifericos gamer en Villano Gamer Store.');
  }, [product, activeVariant, activeImage]);

  if (isLoading) return <ProductSkeleton />;
  if (isError || !product) return <ErrorState message="No se pudo cargar el producto." onRetry={() => refetch()} />;

  const stockStatus = activeVariant ? computeStockStatus(activeVariant.stockQuantity) : product.aggregateStock;
  const canAdd = !!activeVariant && activeVariant.stockQuantity > 0;

  const handleAdd = () => {
    if (!activeVariant) return;
    addItem({
      variantId: activeVariant.id,
      productId: product.id,
      productSlug: product.slug,
      productName: product.name,
      variantLabel: activeVariant.attributes.map((a) => a.value).join(' / '),
      unitPrice: activeVariant.price,
      image: product.primaryImage,
      maxStock: activeVariant.stockQuantity,
    });
    trackEvent(product.id, 'add_to_cart');
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  return (
    <div>
      <nav className="mb-4 text-sm text-txt-faint">
        <Link to="/catalogo" className="hover:text-neon-purple-bright">Catalogo</Link>
        <span className="mx-2">/</span>
        <Link to={`/catalogo?categoria=${product.categorySlug}`} className="hover:text-neon-purple-bright">
          {product.categoryName}
        </Link>
      </nav>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Galeria */}
        <div>
          <div className="card aspect-square overflow-hidden">
            <ProductImg
              url={product.images[activeImage]?.urlWebp ?? product.primaryImage}
              alt={product.name}
              className="h-full w-full object-cover"
            />
          </div>
          {product.images.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto">
              {product.images.map((img, i) => (
                <button
                  key={img.id}
                  onClick={() => setActiveImage(i)}
                  className={`h-16 w-16 shrink-0 overflow-hidden rounded border ${i === activeImage ? 'border-neon-purple shadow-neon-purple' : 'border-base-border'}`}
                  aria-label={`Imagen ${i + 1}`}
                >
                  <ProductImg url={img.urlWebp} alt={`${product.name} ${i + 1}`} className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          {product.brand && <span className="text-sm uppercase tracking-wide text-txt-faint">{product.brand}</span>}
          <h1 className="font-display text-2xl font-bold text-txt-primary sm:text-3xl">{product.name}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span className="font-display text-3xl font-bold text-neon-green">
              {formatBs(activeVariant?.price ?? product.fromPrice)}
            </span>
            {product.originalPrice != null && product.originalPrice > product.fromPrice && (
              <>
                <span className="text-lg text-txt-faint line-through">
                  {formatBs(product.originalPrice)}
                </span>
                <span className="rounded-full bg-accent2 px-2 py-0.5 text-xs font-bold text-accent2-on">
                  -{Math.round((1 - product.fromPrice / product.originalPrice) * 100)}%
                </span>
              </>
            )}
            <StockBadge status={stockStatus} />
          </div>

          {product.description && <p className="mt-4 text-txt-muted">{product.description}</p>}

          {/* Selector de variantes */}
          {product.variants.length > 0 && (
            <div className="mt-6">
              <h2 className="mb-2 font-display text-sm uppercase tracking-wide text-neon-purple-bright">
                Elige una opcion
              </h2>
              <div className="grid gap-2 sm:grid-cols-2">
                {product.variants.map((v) => {
                  const label = v.attributes.map((a) => a.value).join(' / ') || v.sku;
                  const out = v.stockQuantity <= 0;
                  const active = v.id === activeVariantId;
                  return (
                    <button
                      key={v.id}
                      onClick={() => setActiveVariantId(v.id)}
                      disabled={out}
                      className={`flex items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition-colors ${active ? 'border-neon-green bg-neon-green/10' : 'border-base-border hover:border-neon-purple/60'} ${out ? 'cursor-not-allowed opacity-45' : ''}`}
                    >
                      <span className="font-medium">{label}</span>
                      <span className={active ? 'text-neon-green' : 'text-txt-muted'}>{formatBs(v.price)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <button
            onClick={handleAdd}
            disabled={!canAdd}
            className="btn-accent mt-6 w-full py-3 text-base sm:w-auto sm:px-10 inline-flex items-center justify-center gap-2"
          >
            {added ? <><Check className="h-5 w-5" /> Agregado</> : canAdd ? <><ShoppingBag className="h-5 w-5" /> Agregar al carrito</> : 'Agotado'}
          </button>
          {activeVariant && activeVariant.stockQuantity > 0 && activeVariant.stockQuantity < 5 && (
            <p className="mt-2 text-sm text-status-low">
              ¡Solo quedan {activeVariant.stockQuantity} unidades!
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function ProductSkeleton() {
  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div className="skeleton aspect-square rounded-lg" />
      <div className="space-y-4">
        <div className="skeleton h-4 w-1/4" />
        <div className="skeleton h-8 w-3/4" />
        <div className="skeleton h-8 w-1/3" />
        <div className="skeleton h-24 w-full" />
        <div className="flex items-center gap-2 text-txt-muted"><Spinner /> Cargando…</div>
      </div>
    </div>
  );
}
