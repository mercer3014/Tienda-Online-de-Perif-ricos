import { prisma } from '../../lib/prisma.js';

/** Lista atributos con sus valores (para filtros del catalogo y formularios admin). */
export async function listAttributes() {
  const attrs = await prisma.attribute.findMany({
    orderBy: { name: 'asc' },
    include: { values: { orderBy: { value: 'asc' } } },
  });
  return attrs.map((a) => ({
    id: a.id,
    name: a.name,
    values: a.values.map((v) => ({ id: v.id, value: v.value })),
  }));
}
