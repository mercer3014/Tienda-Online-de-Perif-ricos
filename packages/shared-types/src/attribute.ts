import { z } from 'zod';

export const createAttributeSchema = z.object({
  name: z.string().trim().min(2).max(80),
});

export const createAttributeValueSchema = z.object({
  value: z.string().trim().min(1).max(80),
});

export type CreateAttributeInput = z.infer<typeof createAttributeSchema>;
export type CreateAttributeValueInput = z.infer<typeof createAttributeValueSchema>;
