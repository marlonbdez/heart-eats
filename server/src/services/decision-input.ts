import { z } from 'zod';
import { text } from './input-fields.js';

export const rejectReasons = [
  'not_independent',
  'no_evidence',
  'duplicate',
  'out_of_zone',
  'other',
] as const;

// `ModerationDecision` de la web. De `approve` solo se reconoce la acción: la
// publicación de la ficha llega en otra PR.
export const decisionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('approve') }),
  z.object({
    action: z.literal('reject'),
    reason: z.enum(rejectReasons),
    note: text(1000).optional(),
  }),
  z.object({ action: z.literal('ask_info'), note: text(1000) }),
]);

export type Decision = z.infer<typeof decisionSchema>;
