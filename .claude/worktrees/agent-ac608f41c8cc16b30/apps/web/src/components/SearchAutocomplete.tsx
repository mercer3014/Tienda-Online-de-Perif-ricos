import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import type { Paginated, ProductListItemDTO } from '@villano/shared-types';
import { apiFetch } from '../lib/api';
import { formatBs } from '../lib/format';
import { ProductImg } from './ui';

/** Buscador con sugerencias en vivo (miniatura + nombre + precio). */
export function SearchAutocomplete({
  placeholder = 'Buscar mouse, teclados, componentes…',
  onNavigate,
  autoFocus,
}: {
  placeholder?: string;
  onNavigate?: () => void;
  autoFocus?: boolean;
}) {
  const navigate = useNavigate();
  const [term, setTerm] = useState('');
  const [debounced, setDebounced] = useState('');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(term.trim()), 300);
    return () => clearTimeout(t);
  }, [term]);

  const { data, isFetching } = useQuery({
    queryKey: ['suggest', debounced],
    queryFn: () => apiFetch<Paginated<ProductListItemDTO>>(`/products?page=1&pageSize=6&search=${encodeURIComponent(debounced)}`),
    enabled: debounced.length >= 2,
    staleTime: 30_000,
  });

  const suggestions = debounced.length >= 2 ? (data?.items ?? []) : [];

  const goToResults = (e: FormEvent) => {
    e.preventDefault();
    const q = term.trim();
    navigate(q ? `/catalogo?search=${encodeURIComponent(q)}` : '/catalogo');
    setOpen(false);
    onNavigate?.();
  };

  const goToProduct = (slug: string) => {
    navigate(`/producto/${slug}`);
    setTerm('');
    setOpen(false);
    onNavigate?.();
  };

  return (
    <form onSubmit={goToResults} className="relative w-full">
      <input
        type="search"
        value={term}
        autoFocus={autoFocus}
        onChange={(e) => { setTerm(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        aria-label="Buscar productos"
        className="w-full rounded-md border border-base-border bg-base-void py-2 pl-9 pr-3 text-sm text-txt-primary placeholder:text-txt-faint focus:border-neon-purple"
      />
      <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-txt-faint" />

      {open && debounced.length >= 2 && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border border-base-border bg-base-panel shadow-panel">
          {suggestions.length === 0 ? (
            <p className="px-3 py-3 text-sm text-txt-muted">
              {isFetching ? 'Buscando…' : 'Sin resultados'}
            </p>
          ) : (
            <>
              {suggestions.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => goToProduct(p.slug)}
                  className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-base-border/30"
                >
                  <ProductImg url={p.primaryImage} alt={p.name} className="h-9 w-9 shrink-0 rounded object-cover" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-txt-primary">{p.name}</span>
                    {p.brand && <span className="block truncate text-xs text-txt-faint">{p.brand}</span>}
                  </span>
                  <span className="shrink-0 text-sm font-semibold text-neon-green">{formatBs(p.fromPrice)}</span>
                </button>
              ))}
              <button
                type="submit"
                className="block w-full border-t border-base-border px-3 py-2 text-center text-xs font-semibold text-neon-purple-bright hover:bg-base-border/20"
              >
                Ver todos los resultados de “{term.trim()}”
              </button>
            </>
          )}
        </div>
      )}
    </form>
  );
}
