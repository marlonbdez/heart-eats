import { Schema, model, type Types } from 'mongoose';

// Caduca a los 7 días sin actividad (ADR 0007). Cada petición con sesión
// renueva `lastSeenAt`; Mongo borra las que llevan ese tiempo sin tocarse.
export const SESSION_IDLE_SECONDS = 7 * 24 * 60 * 60;

const sessionSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  tokenHash: { type: String, required: true, unique: true },
  lastSeenAt: {
    type: Date,
    required: true,
    default: Date.now,
    index: { expires: SESSION_IDLE_SECONDS },
  },
});

export interface SessionRecord {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  tokenHash: string;
  lastSeenAt: Date;
}

export const Session = model('Session', sessionSchema);
