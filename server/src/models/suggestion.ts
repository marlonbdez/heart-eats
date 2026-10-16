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
  // Local al que apunta (correcciones, equipo y retiradas).
  targetRestaurantId?: Types.ObjectId;
  payload: Record<string, unknown>;
  evidence: string[];
  contactEmail?: string; // privado: nunca sale por la lectura pública
  locale: 'es' | 'en';
  warnings: SuggestionWarning[];
  // Ciudad del local propuesto sin acentos, para buscar duplicados.
  cityKey?: string;
  // Por qué se rechazó y quién lo decidió.
  resolution?: {
    reason: string;
    note?: string;
    decidedBy: Types.ObjectId;
    decidedAt: Date;
  };
  // «Info pedida»: la nota de Moderación, el plazo y el `nonce` que valida el
  // enlace del correo (se borra al responder o cerrar la solicitud).
  infoRequest?: {
    note: string;
    requestedAt: Date;
    deadline: Date;
    nonce?: string;
  };
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
    // Obligatorio salvo en un local nuevo: lo corregido, su equipo o su retirada.
    targetRestaurantId: {
      type: Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: [
        function (this: { type?: string }) {
          return this.type !== 'new';
        },
        'targetRestaurantId es obligatorio si no es un local nuevo',
      ],
    },
    // Lo que se propone, ya validado por la ruta que lo recibe.
    payload: { type: Schema.Types.Mixed, required: true },
    evidence: { type: [String], default: [] },
    contactEmail: { type: String, maxlength: 254 },
    locale: { type: String, enum: ['es', 'en'], default: 'es' },
    warnings: { type: [Schema.Types.Mixed], default: [] },
    cityKey: String,
    resolution: {
      type: new Schema(
        {
          reason: { type: String, required: true },
          note: String,
          decidedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
          },
          decidedAt: { type: Date, required: true },
        },
        { _id: false },
      ),
    },
    infoRequest: {
      type: new Schema(
        {
          note: { type: String, required: true },
          requestedAt: { type: Date, required: true },
          deadline: { type: Date, required: true },
          nonce: String,
        },
        { _id: false },
      ),
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

// Cola de moderación y búsqueda de duplicados.
suggestionSchema.index({ status: 1, createdAt: 1 });
suggestionSchema.index({ type: 1, cityKey: 1 });

export const Suggestion = model('Suggestion', suggestionSchema);
