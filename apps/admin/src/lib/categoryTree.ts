import type { CategoryNode } from '@villano/shared-types';

/** Aplana el arbol completo (todos los niveles) con indentacion visual por profundidad. */
export function flattenCategories(nodes: CategoryNode[], depth = 0): { id: string; label: string }[] {
  return nodes.flatMap((n) => [
    { id: n.id, label: `${depth > 0 ? '  '.repeat(depth) + '↳ ' : ''}${n.name}` },
    ...flattenCategories(n.children, depth + 1),
  ]);
}

/** Id de una categoria + todos sus descendientes (recursivo, cualquier profundidad). Sirve
 * para que filtrar por una categoria padre incluya productos de sus subcategorias. */
export function collectIdsWithDescendants(nodes: CategoryNode[], rootId: string): Set<string> {
  const ids = new Set<string>();
  const find = (list: CategoryNode[]): CategoryNode | null => {
    for (const n of list) {
      if (n.id === rootId) return n;
      const found = find(n.children);
      if (found) return found;
    }
    return null;
  };
  const collect = (n: CategoryNode) => {
    ids.add(n.id);
    n.children.forEach(collect);
  };
  const target = find(nodes);
  if (target) collect(target);
  return ids;
}
