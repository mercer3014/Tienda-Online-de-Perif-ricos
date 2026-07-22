import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import {
  LayoutDashboard,
  Package,
  FolderTree,
  ShoppingBag,
  BarChart3,
  ClipboardList,
  ShieldCheck,
  Users,
  LogOut,
  Menu,
} from 'lucide-react';
import type { PermissionKey } from '@villano/shared-types';
import { useAuth } from '../store/auth';
import { ThemeToggle } from './ThemeToggle';

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  anyOf: PermissionKey[];
}

const NAV: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, anyOf: ['ver_dashboard'] },
  { to: '/productos', label: 'Productos', icon: Package, anyOf: ['ver_dashboard', 'crear_producto', 'editar_producto'] },
  { to: '/categorias', label: 'Categorias', icon: FolderTree, anyOf: ['crear_categoria', 'editar_categoria', 'modificar_categoria', 'eliminar_categoria'] },
  { to: '/pedidos', label: 'Pedidos', icon: ShoppingBag, anyOf: ['ver_pedidos'] },
  { to: '/metricas', label: 'Metricas', icon: BarChart3, anyOf: ['ver_metricas'] },
  { to: '/auditoria', label: 'Auditoria', icon: ClipboardList, anyOf: ['ver_auditoria'] },
  { to: '/roles', label: 'Roles y permisos', icon: ShieldCheck, anyOf: ['gestionar_roles'] },
  { to: '/usuarios', label: 'Usuarios', icon: Users, anyOf: ['gestionar_usuarios'] },
];

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, logout, can } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const visibleNav = NAV.filter((n) => n.anyOf.some((p) => can(p)));

  const sidebar = (
    <nav className="flex h-full flex-col gap-1 p-3">
      <div className="mb-4 flex items-center justify-between px-2 pt-2">
        <p className="font-display text-lg font-bold tracking-wider text-neon-purple-bright">
          VILLANO<span className="text-neon-green">·</span>ADMIN
        </p>
      </div>
      {visibleNav.map((n) => {
        const IconComponent = n.icon;
        return (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.to === '/'}
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                isActive ? 'bg-neon-purple/15 text-neon-green shadow-neon-purple/40' : 'text-txt-muted hover:bg-base-panel hover:text-txt-primary',
              )
            }
          >
            <IconComponent className="h-4 w-4 shrink-0" />
            {n.label}
          </NavLink>
        );
      })}
      <div className="mt-auto border-t border-base-border pt-3 space-y-2">
        <div className="px-2">
          <ThemeToggle className="w-full justify-start" />
        </div>
        <div className="px-3 py-1 text-xs">
          <p className="font-semibold text-txt-primary">{user?.name}</p>
          <p className="text-txt-faint">{user?.role.name}</p>
        </div>
        <button
          onClick={() => { logout(); navigate('/login'); }}
          className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-status-out hover:bg-status-out/10 transition-colors"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Cerrar sesion
        </button>
      </div>
    </nav>
  );

  return (
    <div className="flex min-h-screen">
      {/* Sidebar desktop */}
      <aside className="hidden w-60 shrink-0 border-r border-base-border bg-base-graphite lg:block">
        {sidebar}
      </aside>

      {/* Sidebar mobile */}
      {open && (
        <>
          <div className="fixed inset-0 z-40 bg-black/70 lg:hidden" onClick={() => setOpen(false)} />
          <aside className="fixed left-0 top-0 z-50 h-full w-64 border-r border-base-border bg-base-graphite lg:hidden">
            {sidebar}
          </aside>
        </>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-base-border bg-base-black/85 px-4 py-3 backdrop-blur lg:hidden">
          <div className="flex items-center gap-3">
            <button onClick={() => setOpen(true)} aria-label="Abrir menu" className="text-txt-muted p-1 rounded hover:text-neon-purple">
              <Menu className="h-5 w-5" />
            </button>
            <span className="font-display font-bold text-neon-purple-bright">VILLANO·ADMIN</span>
          </div>
          <ThemeToggle />
        </header>
        <main className="min-w-0 flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
