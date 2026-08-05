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
import type { CategoryIconKey } from '@villano/shared-types';

type IconComponent = ComponentType<{ className?: string }>;

/** Paleta fija que puede elegir el admin al crear/editar una categoria.
 * Las claves deben existir en CategoryIconKey (shared-types); agregar un
 * icono nuevo requiere sumarlo alla tambien. */
export const CATEGORY_ICON_OPTIONS: { key: CategoryIconKey; label: string; icon: IconComponent }[] = [
  { key: 'keyboard', label: 'Teclado', icon: Keyboard },
  { key: 'mouse', label: 'Mouse', icon: Mouse },
  { key: 'headphones', label: 'Audífonos', icon: Headphones },
  { key: 'speaker', label: 'Parlante', icon: Speaker },
  { key: 'mic', label: 'Micrófono', icon: Mic },
  { key: 'webcam', label: 'Webcam', icon: Webcam },
  { key: 'monitor', label: 'Monitor', icon: Monitor },
  { key: 'cpu', label: 'Procesador', icon: Cpu },
  { key: 'memory', label: 'Memoria RAM', icon: MemoryStick },
  { key: 'circuit-board', label: 'Placa / componente', icon: CircuitBoard },
  { key: 'hard-drive', label: 'Almacenamiento', icon: HardDrive },
  { key: 'fan', label: 'Ventilación', icon: Fan },
  { key: 'cable', label: 'Cable', icon: Cable },
  { key: 'usb', label: 'USB', icon: Usb },
  { key: 'router', label: 'Red / router', icon: Router },
  { key: 'gamepad', label: 'Control', icon: Gamepad2 },
  { key: 'joystick', label: 'Joystick', icon: Joystick },
  { key: 'chair', label: 'Silla gamer', icon: Armchair },
  { key: 'package', label: 'Accesorio genérico', icon: Package },
  { key: 'layout-grid', label: 'Genérico', icon: LayoutGrid },
];

export const DEFAULT_CATEGORY_ICON: IconComponent = LayoutGrid;

export function getCategoryIconComponent(key: string | null | undefined): IconComponent {
  return CATEGORY_ICON_OPTIONS.find((o) => o.key === key)?.icon ?? DEFAULT_CATEGORY_ICON;
}
