import { Schema, model, type Types } from 'mongoose';

export const userRoles = ['community', 'moderator', 'admin'] as const;
export type UserRole = (typeof userRoles)[number];

// Roles que pueden entrar a moderar (ADR 0008).
export const moderationRoles = ['moderator', 'admin'] as const;

// Ámbito de quien ve todas las regiones (el administrador). No se guarda.
export const ANY_COUNTRY = '*';

export interface ModerationScope {
  country: string; // ISO 3166-1 alfa-2
  city?: string;
}

export interface UserRecord {
  _id: Types.ObjectId;
  email: string;
  role: UserRole;
  moderationScope: ModerationScope[];
  // Baja: el usuario sigue en la auditoría pero ya no puede entrar.
  disabledAt?: Date;
  createdAt: Date;
}

const scopeSchema = new Schema(
  {
    country: {
      type: String,
      required: true,
      uppercase: true,
      match: /^[A-Z]{2}$/,
    },
    city: { type: String, maxlength: 100 },
  },
  { _id: false },
);

// Solo el correo y el rol: sin otros datos personales (docs/01 §2.4).
const userSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
    },
    role: { type: String, enum: userRoles, required: true },
    moderationScope: { type: [scopeSchema], default: [] },
    disabledAt: Date,
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export const User = model('User', userSchema);
