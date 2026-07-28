import { create } from 'zustand';

export interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** true = accion destructiva (boton en color alerta). */
  danger?: boolean;
}

interface ConfirmState {
  open: boolean;
  options: ConfirmOptions;
  resolve?: (v: boolean) => void;
  ask: (options: ConfirmOptions) => Promise<boolean>;
  close: (value: boolean) => void;
}

export const useConfirm = create<ConfirmState>((set, get) => ({
  open: false,
  options: { title: '' },
  ask: (options) =>
    new Promise<boolean>((resolve) => {
      set({ open: true, options, resolve });
    }),
  close: (value) => {
    get().resolve?.(value);
    set({ open: false, resolve: undefined });
  },
}));

/** Abre el modal de confirmacion y resuelve true/false. */
export const confirmAction = (options: ConfirmOptions): Promise<boolean> =>
  useConfirm.getState().ask(options);
