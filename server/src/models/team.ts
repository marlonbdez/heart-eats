import { Schema, model, type Types } from 'mongoose';
import {
  consentBy,
  disabilityTypes,
  teamAreas,
  teamLevels,
  type DisabilityType,
  type TeamArea,
  type TeamLevel,
} from '../catalog.js';

export interface TeamRecord {
  _id: Types.ObjectId;
  restaurantId: Types.ObjectId;
  visibilityLevel: TeamLevel;
  summary: { totalStaff: number; staffWithDisability: number };
  areas?: TeamArea[];
  disabilityTypes?: DisabilityType[];
  stories?: {
    displayName: string;
    role: string;
    storyText: string;
    photoUrl?: string;
    consentRecordedAt: Date;
    consentBy: (typeof consentBy)[number];
    revokedAt?: Date;
    // Cuándo se borró el contenido de una historia retirada. Desde entonces
    // solo quedan el consentimiento y las fechas; faltan nombre, puesto, texto y
    // foto (la historia ya no se sirve: tiene `revokedAt`).
    purgedAt?: Date;
  }[];
}

// Una historia sin consentimiento registrado no se guarda (spec §2.2). Al
// borrar una retirada se conserva el hueco (su posición no cambia) sin los
// textos, por eso estos son obligatorios salvo en una historia purgada.
const contentRequired: [(this: { purgedAt?: Date }) => boolean, string] = [
  function () {
    return !this.purgedAt;
  },
  'Falta el contenido de la historia',
];

const storySchema = new Schema(
  {
    displayName: { type: String, required: contentRequired, maxlength: 80 },
    role: { type: String, required: contentRequired, maxlength: 80 },
    storyText: { type: String, required: contentRequired, maxlength: 2000 },
    photoUrl: String,
    consentRecordedAt: { type: Date, required: true },
    consentBy: { type: String, enum: consentBy, required: true },
    revokedAt: Date,
    purgedAt: Date,
  },
  { _id: false },
);

const teamSchema = new Schema(
  {
    restaurantId: {
      type: Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
      unique: true,
    },
    visibilityLevel: {
      type: String,
      enum: teamLevels,
      required: true,
      default: 'minimal',
    },
    summary: {
      totalStaff: {
        type: Number,
        required: true,
        min: 1,
        validate: { validator: Number.isInteger },
      },
      staffWithDisability: {
        type: Number,
        required: true,
        min: 0,
        validate: [
          { validator: Number.isInteger },
          {
            validator: function (
              this: { summary?: { totalStaff?: number } },
              v: number,
            ) {
              return v <= (this.summary?.totalStaff ?? 0);
            },
            message: 'staffWithDisability no puede superar a totalStaff',
          },
        ],
      },
    },
    areas: { type: [{ type: String, enum: teamAreas }], default: undefined },
    disabilityTypes: {
      type: [{ type: String, enum: disabilityTypes }],
      default: undefined,
    },
    stories: {
      type: [storySchema],
      default: undefined,
      validate: { validator: (v: unknown[]) => v.length <= 3 },
    },
  },
  { timestamps: true },
);

export const Team = model('Team', teamSchema);
