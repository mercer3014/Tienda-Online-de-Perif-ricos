import { create } from 'zustand';

export interface Toast {
  id: number;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface ToastState {
  toasts: Toast[];
  push: (type: Toast['type'], message: string) => void;
  dismiss: (id: number) => void;
}

let counter = 0;
const MAX_TOASTS = 4;
const timers = new Map<number, ReturnType<typeof setTimeout>>();

export const useToast = create<ToastState>((set, get) => ({
  toasts: [],
  push: (type, message) => {
    // Dedupe: si ya hay un toast identico visible, solo renueva su tiempo de vida
    // (evita pilas de mensajes repetidos por clicks consecutivos).
    const existing = get().toasts.find((t) => t.type === type && t.message === message);
    if (existing) {
      const old = timers.get(existing.id);
      if (old) clearTimeout(old);
      timers.set(
        existing.id,
        setTimeout(() => {
          set((s) => ({ toasts: s.toasts.filter((t) => t.id !== existing.id) }));
          timers.delete(existing.id);
        }, 4000),
      );
      return;
    }

    const id = ++counter;
    set((s) => {
      // Tope de pila: descarta los mas viejos si se acumulan.
      const next = [...s.toasts, { id, type, message }];
      return { toasts: next.slice(-MAX_TOASTS) };
    });
    timers.set(
      id,
      setTimeout(() => {
        set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
        timers.delete(id);
      }, 4000),
    );
  },
  dismiss: (id) => {
    const t = timers.get(id);
    if (t) clearTimeout(t);
    timers.delete(id);
    set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) }));
  },
}));

export const toast = {
  success: (m: string) => useToast.getState().push('success', m),
  error: (m: string) => useToast.getState().push('error', m),
  info: (m: string) => useToast.getState().push('info', m),
};
