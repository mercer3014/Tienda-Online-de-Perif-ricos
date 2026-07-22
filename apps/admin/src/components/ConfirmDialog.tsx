import { AlertTriangle } from 'lucide-react';
import { useConfirm } from '../lib/confirm';

/** Modal de confirmacion global. Se monta una vez en el root (junto al Toaster). */
export function ConfirmDialog() {
  const { open, options, close } = useConfirm();
  if (!open) return null;

  const { title, description, confirmLabel, cancelLabel, danger } = options;

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 p-4"
      onClick={() => close(false)}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="card w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-3">
          {danger && (
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-status-out/12 text-status-out">
              <AlertTriangle className="h-5 w-5" />
            </span>
          )}
          <div className="min-w-0">
            <h2 className="font-display text-lg tracking-wide text-txt-primary">{title}</h2>
            {description && <p className="mt-1 text-sm text-txt-muted">{description}</p>}
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button className="btn-secondary" onClick={() => close(false)} autoFocus>
            {cancelLabel ?? 'Cancelar'}
          </button>
          <button
            className={danger ? 'btn-danger !border-status-out !bg-status-out/12' : 'btn-primary'}
            onClick={() => close(true)}
          >
            {confirmLabel ?? 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  );
}
