import type { ComponentType } from 'react';
import {
  Armchair,
  Cable,
  CircuitBoard,
  Cpu,
  Fan,
  Gamepad2,
  HardDrive,
  Headphones,
  Joystick,
  Keyboard,
  LayoutGrid,
  MemoryStick,
  Mic,
  Monitor,
  Mouse,
  Package,
  Router,
  Speaker,
  Usb,
  Webcam,
} from 'lucide-react';

type IconComponent = ComponentType<{ className?: string }>;

/** Debe reflejar la misma paleta que CategoryIconKey (shared-types) y el
 * mapeo equivalente en apps/admin/src/lib/categoryIcons.ts. */
const CATEGORY_ICON_MAP: Record<string, IconComponent> = {
  keyboard: Keyboard,
  mouse: Mouse,
  headphones: Headphones,
  speaker: Speaker,
  mic: Mic,
  webcam: Webcam,
  monitor: Monitor,
  cpu: Cpu,
  memory: MemoryStick,
  'circuit-board': CircuitBoard,
  'hard-drive': HardDrive,
  fan: Fan,
  cable: Cable,
  usb: Usb,
  router: Router,
  gamepad: Gamepad2,
  joystick: Joystick,
  chair: Armchair,
  package: Package,
  'layout-grid': LayoutGrid,
};

export const DEFAULT_CATEGORY_ICON: IconComponent = LayoutGrid;

/** Icono elegido por el admin para la categoria; si no tiene (o es una clave
 * desconocida/vieja), cae al icono generico en vez de no mostrar nada. */
export function getCategoryIconComponent(key: string | null | undefined): IconComponent {
  if (!key) return DEFAULT_CATEGORY_ICON;
  return CATEGORY_ICON_MAP[key] ?? DEFAULT_CATEGORY_ICON;
}
