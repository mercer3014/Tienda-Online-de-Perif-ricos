import clsx from 'clsx';
import type { ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { useToast } from '../lib/toast';
import { useDismissable } from '../lib/useDismissable';

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Cargando"
      className={clsx('inline-block animate-spin rounded-full border-2 border-neon-purple/30 border-t-neon-purple', className ?? 'h-5 w-5')}
    />
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx('skeleton', className)} aria-hidden />;
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="card mx-auto max-w-md p-8 text-center" role="alert">
      <div className="mb-2 flex justify-center text-status-out">
        <AlertTriangle className="h-10 w-10" />
      </div>
      <p className="mb-4 text-txt-muted">{message}</p>
      {onRetry && <button className="btn-primary" onClick={onRetry}>Reintentar</button>}
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="card p-10 text-center">
      <h3 className="mb-1 text-lg text-txt-primary">{title}</h3>
      {hint && <p className="text-sm text-txt-muted">{hint}</p>}
    </div>
  );
}

export function PageLoader() {
  return (
    <div className="flex items-center justify-center gap-2 py-20 text-txt-muted">
      <Spinner /> Cargando…
    </div>
  );
}

export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  useDismissable(true, onClose);
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4" onClick={onClose}>
      <div
        className={clsx('card my-8 w-full p-5', wide ? 'max-w-3xl' : 'max-w-lg')}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={title}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg tracking-wide text-txt-primary">{title}</h2>
          <button onClick={onClose} className="rounded p-1 text-txt-muted hover:text-neon-purple" aria-label="Cerrar">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

const TOAST_ICON = { success: CheckCircle2, error: XCircle, info: Info } as const;
const TOAST_CIRCLE_CLASS = {
  success: 'bg-status-stock/12 text-status-stock',
  error: 'bg-status-out/12 text-status-out',
  info: 'bg-neon-purple/12 text-neon-purple-bright',
} as const;

/**
 * Caja de confirmacion centrada (no una notificacion de esquina): aparece en
 * medio de la pantalla, se nota, y se desvanece sola. Mismo lenguaje visual
 * que ConfirmDialog (icono en circulo + texto) para que se sientan parte del
 * mismo sistema en vez de dos estilos de aviso distintos. No bloquea la
 * pagina (pointer-events-none en el contenedor) salvo la caja misma, que se
 * puede tocar para descartarla antes.
 */
export function Toaster() {
  const toasts = useToast((s) => s.toasts);
  const dismiss = useToast((s) => s.dismiss);
  return (
    <div className="pointer-events-none fixed inset-0 z-[100] flex flex-col items-center justify-center gap-3 p-4">
      {toasts.map((t) => {
        const Icon = TOAST_ICON[t.type];
        return (
          <div
            key={t.id}
            onClick={() => dismiss(t.id)}
            role="status"
            className="toast-pop card pointer-events-auto flex w-full max-w-sm cursor-pointer items-start gap-3 p-5"
          >
            <span className={clsx('mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full', TOAST_CIRCLE_CLASS[t.type])}>
              <Icon className="h-5 w-5" />
            </span>
            <p className="min-w-0 flex-1 pt-1.5 text-sm font-medium text-txt-primary">{t.message}</p>
          </div>
        );
      })}
    </div>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-txt-muted">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-txt-faint">{hint}</span>}
    </label>
  );
}
