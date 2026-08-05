import { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import {
  LayoutDashboard,
  Package,
  FolderTree,
  Sliders,
  ShoppingBag,
  BarChart3,
  ClipboardList,
  ShieldCheck,
  Users,
  LogOut,
  Menu,
  ChevronsLeft,
  ChevronsRight,
  Settings,
} from 'lucide-react';
import type { PermissionKey } from '@villano/shared-types';
import { useAuth } from '../store/auth';
import { ThemeToggle } from './ThemeToggle';
import { confirmAction } from '../lib/confirm';

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  anyOf: PermissionKey[];
}

const NAV: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, anyOf: ['ver_dashboard'] },
  { to: '/productos', label: 'Productos', icon: Package, anyOf: ['ver_dashboard', 'crear_producto', 'editar_producto'] },
  { to: '/categorias', label: 'Categorías', icon: FolderTree, anyOf: ['crear_categoria', 'editar_categoria', 'modificar_categoria', 'eliminar_categoria'] },
  { to: '/atributos', label: 'Atributos', icon: Sliders, anyOf: ['crear_producto'] },
  { to: '/pedidos', label: 'Pedidos', icon: ShoppingBag, anyOf: ['ver_pedidos'] },
  { to: '/metricas', label: 'Métricas', icon: BarChart3, anyOf: ['ver_metricas'] },
  { to: '/auditoria', label: 'Auditoría', icon: ClipboardList, anyOf: ['ver_auditoria'] },
  { to: '/roles', label: 'Roles y permisos', icon: ShieldCheck, anyOf: ['gestionar_roles'] },
  { to: '/usuarios', label: 'Usuarios', icon: Users, anyOf: ['gestionar_usuarios'] },
  { to: '/configuracion', label: 'Configuración', icon: Settings, anyOf: ['gestionar_configuracion'] },
];

const STORAGE_KEY = 'villano_admin_sidebar';

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, logout, can } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false); // drawer mobile
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(STORAGE_KEY) === 'collapsed');

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, collapsed ? 'collapsed' : 'expanded');
  }, [collapsed]);

  const visibleNav = NAV.filter((n) => n.anyOf.some((p) => can(p)));

  const handleLogout = async () => {
    const ok = await confirmAction({
      title: '¿Salir?',
      description: 'Vas a salir del panel administrativo.',
      confirmLabel: 'Salir',
      danger: true,
    });
    if (ok) {
      logout();
      navigate('/login');
    }
  };

  /** Nombre/rol + cerrar sesion: vive en la barra superior derecha, no en el sidebar. */
  const AccountArea = ({ compact }: { compact?: boolean }) => (
    <div className="flex items-center gap-3">
      {!compact && (
        <div className="text-right text-xs leading-tight">
          <p className="truncate font-semibold text-txt-primary">{user?.name}</p>
          <p className="truncate text-txt-faint">{user?.role.name}</p>
        </div>
      )}
      <button
        onClick={handleLogout}
        title="Salir"
        aria-label="Salir"
        className="inline-flex items-center gap-1.5 rounded-md border border-status-out/30 bg-status-out/5 px-2.5 py-1.5 text-sm font-medium text-status-out shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-status-out/10 hover:shadow-panel"
      >
        <LogOut className="h-4 w-4 shrink-0" />
        <span className="hidden sm:inline">Salir</span>
      </button>
    </div>
  );

  /** `mini` = colapsado (solo iconos). Solo aplica en desktop. */
  const SidebarContent = ({ mini }: { mini: boolean }) => (
    <div className="flex h-full flex-col">
      {/* Cabecera: logo + botón para colapsar (solo desktop) */}
      <div className={clsx('flex items-center px-3 py-4', mini ? 'justify-center' : 'justify-between')}>
        {!mini && (
          <p className="font-display text-lg font-bold tracking-wider text-neon-purple-bright">
            VILLANO<span className="text-neon-green">·</span>ADMIN
          </p>
        )}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="hidden rounded-md p-1.5 text-txt-muted hover:bg-base-panel hover:text-txt-primary lg:block"
          aria-label={mini ? 'Expandir menú' : 'Colapsar menú'}
          title={mini ? 'Expandir menú' : 'Colapsar menú'}
        >
          {mini ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* Navegación (crece y hace scroll si no entra) */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-2">
        {visibleNav.map((n) => {
          const Icon = n.icon;
          return (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === '/'}
              onClick={() => setOpen(false)}
              title={mini ? n.label : undefined}
              aria-label={n.label}
              className={({ isActive }) =>
                clsx(
                  'flex items-center rounded-md py-2.5 text-sm font-medium transition-colors',
                  mini ? 'justify-center px-2' : 'gap-3 px-3',
                  isActive
                    ? 'bg-neon-purple/15 text-neon-purple-bright'
                    : 'text-txt-muted hover:bg-base-panel hover:text-txt-primary',
                )
              }
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!mini && <span className="truncate">{n.label}</span>}
            </NavLink>
          );
        })}
      </nav>
    </div>
  );

  return (
    <div className="flex min-h-screen">
      {/* Sidebar desktop (sticky, altura de viewport, no se estira con el contenido) */}
      <aside
        className={clsx(
          'sticky top-0 hidden h-screen shrink-0 border-r border-base-border bg-base-graphite transition-[width] duration-200 lg:block',
          collapsed ? 'w-16' : 'w-60',
        )}
      >
        <SidebarContent mini={collapsed} />
      </aside>

      {/* Sidebar mobile (drawer, siempre expandido) */}
      {open && (
        <>
          <div className="fixed inset-0 z-40 bg-black/70 lg:hidden" onClick={() => setOpen(false)} />
          <aside className="fixed left-0 top-0 z-50 h-full w-64 border-r border-base-border bg-base-graphite lg:hidden">
            <SidebarContent mini={false} />
          </aside>
        </>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Barra superior mobile */}
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-base-border bg-base-black/85 px-4 py-3 backdrop-blur lg:hidden">
          <div className="flex items-center gap-3">
            <button onClick={() => setOpen(true)} aria-label="Abrir menú" className="rounded p-1 text-txt-muted hover:text-neon-purple">
              <Menu className="h-5 w-5" />
            </button>
            <span className="font-display font-bold text-neon-purple-bright">VILLANO·ADMIN</span>
          </div>
          <div className="flex items-center gap-1.5">
            <ThemeToggle />
            <AccountArea compact />
          </div>
        </header>

        {/* Barra superior desktop: tema + cuenta (nombre/rol) + cerrar sesion */}
        <div className="sticky top-0 z-30 hidden items-center justify-end gap-3 border-b border-base-border bg-base-panel/60 px-6 py-2.5 backdrop-blur lg:flex">
          <ThemeToggle />
          <AccountArea />
        </div>

        <main className="min-w-0 flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
