import clsx from 'clsx';
import type { ReactNode } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { useToast } from '../lib/toast';

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
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4" onClick={onClose}>
      <div
        className={clsx('card my-8 w-full p-5', wide ? 'max-w-3xl' : 'max-w-lg')}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={title}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg uppercase tracking-wide text-neon-purple-bright">{title}</h2>
          <button onClick={onClose} className="rounded p-1 text-txt-muted hover:text-neon-purple" aria-label="Cerrar">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Toaster() {
  const toasts = useToast((s) => s.toasts);
  const dismiss = useToast((s) => s.dismiss);
  return (
    <div className="fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          onClick={() => dismiss(t.id)}
          role="status"
          className={clsx(
            'cursor-pointer rounded-md border px-4 py-3 text-sm shadow-panel backdrop-blur',
            t.type === 'success' && 'border-status-stock/50 bg-status-stock/10 text-status-stock',
            t.type === 'error' && 'border-status-out/50 bg-status-out/10 text-status-out',
            t.type === 'info' && 'border-neon-purple/50 bg-neon-purple/10 text-neon-purple-bright',
          )}
        >
          {t.message}
        </div>
      ))}
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
