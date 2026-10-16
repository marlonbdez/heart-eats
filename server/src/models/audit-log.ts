import { Schema, model, type Types } from 'mongoose';

export const auditEntities = [
  'restaurant',
  'team',
  'suggestion',
  'user',
] as const;

export interface AuditLogRecord {
  _id: Types.ObjectId;
  entity: (typeof auditEntities)[number];
  entityId: Types.ObjectId;
  action: string;
  // Sin `actorId`, lo hizo el sistema (por ejemplo, un cierre por plazo).
  actorId?: Types.ObjectId;
  // Antes y después, nunca con datos sensibles de historias.
  diff?: Record<string, unknown>;
  at: Date;
}

const auditLogSchema = new Schema({
  entity: { type: String, enum: auditEntities, required: true },
  entityId: { type: Schema.Types.ObjectId, required: true },
  action: { type: String, required: true, maxlength: 60 },
  actorId: { type: Schema.Types.ObjectId, ref: 'User' },
  diff: Schema.Types.Mixed,
  at: { type: Date, required: true, default: Date.now },
});

// Historial de una entidad (docs/01 §3).
auditLogSchema.index({ entity: 1, entityId: 1, at: -1 });

export const AuditLog = model('AuditLog', auditLogSchema);
