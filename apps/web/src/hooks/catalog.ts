import { useQuery, useMutation } from '@tanstack/react-query';
import type {
  CategoryNode,
  CreatedOrderResponse,
  CreateOrderInput,
  Paginated,
  ProductDetailDTO,
  ProductEventType,
  ProductListItemDTO,
  StoreStatusDTO,
} from '@villano/shared-types';
import { apiFetch } from '../lib/api';
import { getSessionId } from '../lib/format';

export interface AttributeDTO {
  id: string;
  name: string;
  values: { id: string; value: string }[];
}

export function useCategoryTree() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: () => apiFetch<CategoryNode[]>('/categories/tree'),
    staleTime: 5 * 60 * 1000,
  });
}

export function useAttributes() {
  return useQuery({
    queryKey: ['attributes'],
    queryFn: () => apiFetch<AttributeDTO[]>('/attributes'),
    staleTime: 5 * 60 * 1000,
  });
}

export function useProducts(query: string) {
  return useQuery({
    queryKey: ['products', query],
    queryFn: () => apiFetch<Paginated<ProductListItemDTO>>(`/products?${query}`),
    staleTime: 30 * 1000,
  });
}

export function useProduct(slug: string | undefined) {
  return useQuery({
    queryKey: ['product', slug],
    queryFn: () => apiFetch<ProductDetailDTO>(`/products/${slug}`),
    enabled: !!slug,
  });
}

export function useStoreStatus() {
  return useQuery({
    queryKey: ['store-status'],
    queryFn: () => apiFetch<StoreStatusDTO>('/store/status'),
    staleTime: 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });
}

export function useCreateOrder() {
  return useMutation({
    mutationFn: (input: CreateOrderInput) =>
      apiFetch<CreatedOrderResponse>('/orders', { method: 'POST', body: input }),
  });
}

/** Registro de evento (best-effort; ignora errores para no molestar al usuario). */
export function trackEvent(productId: string, eventType: ProductEventType) {
  apiFetch('/events', {
    method: 'POST',
    body: { productId, eventType, sessionId: getSessionId() },
  }).catch(() => undefined);
}

export function markWhatsappSent(orderId: string) {
  return apiFetch(`/orders/${orderId}/whatsapp-sent`, { method: 'POST' }).catch(() => undefined);
}
