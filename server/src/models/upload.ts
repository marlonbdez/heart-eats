import { Schema, model, type Types } from 'mongoose';

// Una foto subida que espera en cuarentena. Se apunta aquí para saber qué fotos
// hay en el almacén sin tener que listarlo, y para borrar las que nadie usa.
// `usedAt` lo pone la solicitud que la reclama.
const uploadSchema = new Schema(
  {
    key: { type: String, required: true, unique: true },
    contentType: { type: String, required: true },
    size: { type: Number, required: true },
    usedAt: Date,
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
uploadSchema.index({ createdAt: 1 });

export interface UploadRecord {
  _id: Types.ObjectId;
  key: string;
  contentType: string;
  size: number;
  usedAt?: Date;
  createdAt: Date;
}

export const Upload = model('Upload', uploadSchema);
