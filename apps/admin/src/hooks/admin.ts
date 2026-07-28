import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CategoryNode,
  CreateAttributeInput,
  CreateAttributeValueInput,
  CreateCategoryInput,
  UpdateCategoryInput,
  CreateProductInput,
  CreateUserInput,
  CreateVariantInput,
  MetricsSummaryDTO,
  MoveCategoryInput,
  OrderDTO,
  OrderStatus,
  Paginated,
  ProductDetailDTO,
  QuickUpdateVariantInput,
  UpdateProductInput,
  UpdateRolePermissionsInput,
  UpdateUserInput,
} from '@villano/shared-types';
import { apiFetch, apiUpload } from '../lib/api';

export interface AttributeDTO {
  id: string;
  name: string;
  values: { id: string; value: string }[];
}
export interface UploadedImage {
  id: string;
  urlWebp: string;
  isPrimary: boolean;
  displayOrder: number;
  compression: { originalBytes: number; webpBytes: number; savedPct: number };
}
export interface RoleMatrix {
  id: string;
  name: string;
  userCount: number;
  permissions: { permissionId: string; key: string; description: string; allowed: boolean }[];
}
export interface AdminUser {
  id: string;
  name: string;
  email: string;
  active: boolean;
  createdAt: string;
  role: { id: string; name: string };
}
export interface AuditItem {
  id: string;
  user: { id: string; name: string; email: string } | null;
  action: string;
  entityType: string;
  entityId: string | null;
  oldValue: unknown;
  newValue: unknown;
  createdAt: string;
}

// ------------------------------- Productos ---------------------------------
export const useAdminProducts = (query: string) =>
  useQuery({
    queryKey: ['admin-products', query],
    queryFn: () => apiFetch<Paginated<ProductDetailDTO>>(`/admin/products?${query}`),
  });

export const useAdminProduct = (id: string | null) =>
  useQuery({
    queryKey: ['admin-product', id],
    queryFn: () => apiFetch<ProductDetailDTO>(`/admin/products/${id}`),
    enabled: !!id,
  });

export function useProductMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['admin-products'] });
  return {
    create: useMutation({
      mutationFn: (b: CreateProductInput) => apiFetch<ProductDetailDTO>('/admin/products', { method: 'POST', body: b }),
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: ({ id, body }: { id: string; body: UpdateProductInput }) =>
        apiFetch<ProductDetailDTO>(`/admin/products/${id}`, { method: 'PATCH', body }),
      onSuccess: (_d, v) => { invalidate(); qc.invalidateQueries({ queryKey: ['admin-product', v.id] }); },
    }),
    remove: useMutation({
      mutationFn: (id: string) => apiFetch(`/admin/products/${id}`, { method: 'DELETE' }),
      onSuccess: invalidate,
    }),
  };
}

export function useVariantMutations(productId: string | null) {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['admin-product', productId] });
    qc.invalidateQueries({ queryKey: ['admin-products'] });
  };
  return {
    create: useMutation({
      mutationFn: ({ id, body }: { id: string; body: CreateVariantInput }) =>
        apiFetch(`/admin/products/${id}/variants`, { method: 'POST', body }),
      onSuccess: invalidate,
    }),
    quick: useMutation({
      mutationFn: ({ id, body }: { id: string; body: QuickUpdateVariantInput }) =>
        apiFetch(`/admin/variants/${id}/quick`, { method: 'PATCH', body }),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: (id: string) => apiFetch(`/admin/variants/${id}`, { method: 'DELETE' }),
      onSuccess: invalidate,
    }),
  };
}

export function useImageMutations(productId: string | null) {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['admin-product', productId] });
  return {
    upload: useMutation({
      mutationFn: ({ id, file }: { id: string; file: File }) => {
        const fd = new FormData();
        fd.append('image', file);
        return apiUpload<UploadedImage>(`/admin/products/${id}/images`, fd);
      },
      onSuccess: invalidate,
    }),
    setPrimary: useMutation({
      mutationFn: (imageId: string) => apiFetch(`/admin/images/${imageId}/primary`, { method: 'PATCH' }),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: (imageId: string) => apiFetch(`/admin/images/${imageId}`, { method: 'DELETE' }),
      onSuccess: invalidate,
    }),
  };
}

export const useAdminAttributes = () =>
  useQuery({ queryKey: ['admin-attributes'], queryFn: () => apiFetch<AttributeDTO[]>('/admin/attributes') });

export function useAttributeMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['admin-attributes'] });
  return {
    create: useMutation({
      mutationFn: (b: CreateAttributeInput) => apiFetch<AttributeDTO>('/admin/attributes', { method: 'POST', body: b }),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: (id: string) => apiFetch(`/admin/attributes/${id}`, { method: 'DELETE' }),
      onSuccess: invalidate,
    }),
    createValue: useMutation({
      mutationFn: ({ attributeId, body }: { attributeId: string; body: CreateAttributeValueInput }) =>
        apiFetch(`/admin/attributes/${attributeId}/values`, { method: 'POST', body }),
      onSuccess: invalidate,
    }),
    removeValue: useMutation({
      mutationFn: (valueId: string) => apiFetch(`/admin/attribute-values/${valueId}`, { method: 'DELETE' }),
      onSuccess: invalidate,
    }),
  };
}

// ------------------------------ Categorias ---------------------------------
export const useAdminCategoryTree = () =>
  useQuery({ queryKey: ['admin-categories'], queryFn: () => apiFetch<CategoryNode[]>('/admin/categories/tree') });

export function useCategoryMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['admin-categories'] });
  return {
    create: useMutation({ mutationFn: (b: CreateCategoryInput) => apiFetch('/admin/categories', { method: 'POST', body: b }), onSuccess: invalidate }),
    update: useMutation({ mutationFn: ({ id, body }: { id: string; body: UpdateCategoryInput }) => apiFetch(`/admin/categories/${id}`, { method: 'PATCH', body }), onSuccess: invalidate }),
    move: useMutation({ mutationFn: ({ id, body }: { id: string; body: MoveCategoryInput }) => apiFetch(`/admin/categories/${id}/move`, { method: 'PATCH', body }), onSuccess: invalidate }),
    remove: useMutation({ mutationFn: (id: string) => apiFetch(`/admin/categories/${id}`, { method: 'DELETE' }), onSuccess: invalidate }),
  };
}

// -------------------------------- Pedidos ----------------------------------
export const useOrders = (query: string) =>
  useQuery({ queryKey: ['admin-orders', query], queryFn: () => apiFetch<Paginated<OrderDTO>>(`/admin/orders?${query}`) });

export function useOrderStatusMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) =>
      apiFetch(`/admin/orders/${id}/status`, { method: 'PATCH', body: { status } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-orders'] }),
  });
}

// --------------------------------- Roles -----------------------------------
export const useRoles = () => useQuery({ queryKey: ['admin-roles'], queryFn: () => apiFetch<RoleMatrix[]>('/admin/roles') });

export function useRolePermissionsMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateRolePermissionsInput }) =>
      apiFetch<RoleMatrix[]>(`/admin/roles/${id}/permissions`, { method: 'PUT', body }),
    onSuccess: (data) => qc.setQueryData(['admin-roles'], data),
  });
}

// -------------------------------- Usuarios ---------------------------------
export const useUsers = () => useQuery({ queryKey: ['admin-users'], queryFn: () => apiFetch<AdminUser[]>('/admin/users') });

export function useUserMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['admin-users'] });
  return {
    create: useMutation({ mutationFn: (b: CreateUserInput) => apiFetch('/admin/users', { method: 'POST', body: b }), onSuccess: invalidate }),
    update: useMutation({ mutationFn: ({ id, body }: { id: string; body: UpdateUserInput }) => apiFetch(`/admin/users/${id}`, { method: 'PATCH', body }), onSuccess: invalidate }),
    remove: useMutation({ mutationFn: (id: string) => apiFetch(`/admin/users/${id}`, { method: 'DELETE' }), onSuccess: invalidate }),
  };
}

// -------------------------------- Metricas ---------------------------------
export const useMetrics = () => useQuery({ queryKey: ['admin-metrics'], queryFn: () => apiFetch<MetricsSummaryDTO>('/admin/metrics/summary') });

// -------------------------------- Auditoria --------------------------------
export const useAudit = (query: string) =>
  useQuery({ queryKey: ['admin-audit', query], queryFn: () => apiFetch<Paginated<AuditItem>>(`/admin/audit?${query}`) });
