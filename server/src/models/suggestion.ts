import { Schema, model, type Types } from 'mongoose';

export const suggestionTypes = ['new', 'edit', 'team', 'removal'] as const;
export const suggestionStatuses = [
  'pending',
  'info_requested',
  'approved',
  'rejected',
] as const;

export type SuggestionWarning =
  | { kind: 'duplicate'; other: string }
  | { kind: 'chain' }
  | { kind: 'noEvidence' };

// Forma de una solicitud tal como sale de la base de datos con `.lean()`.
export interface SuggestionRecord {
  _id: Types.ObjectId;
  type: (typeof suggestionTypes)[number];
  status: (typeof suggestionStatuses)[number];
  payload: Record<string, unknown>;
  evidence: string[];
  contactEmail?: string; // privado: nunca sale por la lectura pública
  locale: 'es' | 'en';
  warnings: SuggestionWarning[];
  // Ciudad del local propuesto sin acentos, para buscar duplicados.
  cityKey?: string;
  createdAt: Date;
}

const suggestionSchema = new Schema(
  {
    type: { type: String, enum: suggestionTypes, required: true },
    status: {
      type: String,
      enum: suggestionStatuses,
      required: true,
      default: 'pending',
    },
    // Lo que se propone, ya validado por la ruta que lo recibe.
    payload: { type: Schema.Types.Mixed, required: true },
    evidence: { type: [String], default: [] },
    contactEmail: { type: String, maxlength: 254 },
    locale: { type: String, enum: ['es', 'en'], default: 'es' },
    warnings: { type: [Schema.Types.Mixed], default: [] },
    cityKey: String,
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

// Cola de moderación y búsqueda de duplicados.
suggestionSchema.index({ status: 1, createdAt: 1 });
suggestionSchema.index({ type: 1, cityKey: 1 });

export const Suggestion = model('Suggestion', suggestionSchema);
