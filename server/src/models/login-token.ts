import { Schema, model, type Types } from 'mongoose';

// Token de un solo uso del enlace mágico (ADR 0007). Solo se guarda su hash:
// quien lea la base de datos no puede entrar con él.
const loginTokenSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    tokenHash: { type: String, required: true, unique: true },
    // Mongo borra el documento solo cuando caduca.
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
    usedAt: Date,
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export interface LoginTokenRecord {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  tokenHash: string;
  expiresAt: Date;
  usedAt?: Date;
  createdAt: Date;
}

export const LoginToken = model('LoginToken', loginTokenSchema);
