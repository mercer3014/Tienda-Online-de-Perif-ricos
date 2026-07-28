import { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import type { PermissionKey } from '@villano/shared-types';
import { useAuth } from './store/auth';
import { AdminLayout } from './components/AdminLayout';
import { PageLoader, Toaster } from './components/shared';
import { ConfirmDialog } from './components/ConfirmDialog';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ProductsPage from './pages/ProductsPage';
import CategoriesPage from './pages/CategoriesPage';
import AttributesPage from './pages/AttributesPage';
import OrdersPage from './pages/OrdersPage';
import MetricsPage from './pages/MetricsPage';
import AuditPage from './pages/AuditPage';
import RolesPage from './pages/RolesPage';
import UsersPage from './pages/UsersPage';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

/** Requiere sesión válida; opcionalmente un permiso concreto. */
function Guard({ anyOf, children }: { anyOf?: PermissionKey[]; children: React.ReactNode }) {
  const { user, loading, can } = useAuth();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  if (anyOf && !anyOf.some((p) => can(p))) {
    return (
      <div className="card p-8 text-center">
        <h2 className="mb-2 font-display text-lg text-status-out">Sin permiso</h2>
        <p className="text-txt-muted">Tu rol no tiene acceso a esta sección.</p>
      </div>
    );
  }
  return <AdminLayout>{children}</AdminLayout>;
}

export default function App() {
  const loadMe = useAuth((s) => s.loadMe);
  useEffect(() => { loadMe(); }, [loadMe]);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<Guard anyOf={['ver_dashboard']}><DashboardPage /></Guard>} />
          <Route path="/productos" element={<Guard anyOf={['ver_dashboard', 'crear_producto', 'editar_producto']}><ProductsPage /></Guard>} />
          <Route path="/categorias" element={<Guard anyOf={['crear_categoria', 'editar_categoria', 'modificar_categoria', 'eliminar_categoria']}><CategoriesPage /></Guard>} />
          <Route path="/atributos" element={<Guard anyOf={['crear_producto']}><AttributesPage /></Guard>} />
          <Route path="/pedidos" element={<Guard anyOf={['ver_pedidos']}><OrdersPage /></Guard>} />
          <Route path="/metricas" element={<Guard anyOf={['ver_metricas']}><MetricsPage /></Guard>} />
          <Route path="/auditoria" element={<Guard anyOf={['ver_auditoria']}><AuditPage /></Guard>} />
          <Route path="/roles" element={<Guard anyOf={['gestionar_roles']}><RolesPage /></Guard>} />
          <Route path="/usuarios" element={<Guard anyOf={['gestionar_usuarios']}><UsersPage /></Guard>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster />
      <ConfirmDialog />
    </QueryClientProvider>
  );
}
