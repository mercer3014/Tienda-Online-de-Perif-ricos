/**
 * Confirmacion visual de "se agrego al carrito": un punto vuela en arco
 * desde el boton que se toco hasta el icono del carrito (id="cart-icon" en
 * Layout.tsx). Es puramente decorativo y de un solo uso, asi que se maneja
 * fuera de React (crear -> animar -> remover) en vez de sumar estado global
 * solo para esto.
 */
export function flyToCart(fromEl: HTMLElement): void {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const target = document.getElementById('cart-icon');
  if (!target) return;

  const fromRect = fromEl.getBoundingClientRect();
  const toRect = target.getBoundingClientRect();
  const dx = toRect.left + toRect.width / 2 - (fromRect.left + fromRect.width / 2);
  const dy = toRect.top + toRect.height / 2 - (fromRect.top + fromRect.height / 2);

  const dot = document.createElement('div');
  dot.style.cssText = [
    'position:fixed',
    `left:${fromRect.left + fromRect.width / 2 - 6}px`,
    `top:${fromRect.top + fromRect.height / 2 - 6}px`,
    'width:12px',
    'height:12px',
    'border-radius:9999px',
    'background:rgb(var(--color-neon-green))',
    'box-shadow:0 0 10px rgb(var(--color-neon-green) / 0.8)',
    'z-index:200',
    'pointer-events:none',
  ].join(';');
  document.body.appendChild(dot);

  const DURATION = 650;
  const anim = dot.animate(
    [
      { transform: 'translate(0, 0) scale(1)', opacity: 1, offset: 0 },
      { transform: `translate(${dx * 0.5}px, ${dy * 0.5 - 60}px) scale(1)`, opacity: 1, offset: 0.6 },
      { transform: `translate(${dx}px, ${dy}px) scale(0.35)`, opacity: 0, offset: 1 },
    ],
    { duration: DURATION, easing: 'cubic-bezier(.2,.8,.2,1)' },
  );
  // dot.remove() en un Element ya removido no hace nada (no tira error), asi
  // que el timeout de respaldo es seguro aunque onfinish si dispare primero.
  const cleanup = () => dot.remove();
  anim.onfinish = cleanup;
  anim.oncancel = cleanup;
  setTimeout(cleanup, DURATION + 150);
}
