import { Schema, model, type Types } from 'mongoose';
import {
  accessibilityFeatures,
  businessTypes,
  restaurantStatuses,
  verificationLevels,
  verificationMethods,
  type BusinessType,
} from '../catalog.js';
import { normalize } from '../text.js';

// Forma de un local tal como sale de la base de datos con `.lean()`.
export interface RestaurantRecord {
  _id: Types.ObjectId;
  slug: string;
  name: string;
  description?: Record<string, string>;
  businessType: BusinessType;
  cuisineTypes: string[];
  foodTags: string[];
  address: {
    street: string;
    postalCode?: string;
    neighborhood?: string;
    city: string;
    // Nombre de la ciudad en cada idioma de la web ({ es, en }); si falta el
    // idioma, se usa `city`, que va como se escribe allí.
    cityNames?: Record<string, string>;
    region?: string;
    country: string;
  };
  location: { type: 'Point'; coordinates: [number, number] }; // [lng, lat]
  contact?: {
    phone?: string;
    email?: string;
    website?: string;
    instagram?: string;
  };
  openingHours: { day: number; open: string; close: string }[];
  // Precio medio por persona: 1 (€), 2 (€€) o 3 (€€€).
  priceRange?: 1 | 2 | 3;
  // Carta del propio local, en su web.
  menuUrl?: string;
  // Accesibilidad del local (`accessibilityFeatures`); sin la clave, no se sabe.
  accessibility?: (typeof accessibilityFeatures)[number][];
  signatureDishes: {
    name: string;
    description?: string;
    // Precio como lo escribe el local, con su moneda («8,50 €»).
    price?: string;
    photoUrl?: string;
    // Foto subida a HeartEats (nombre del archivo en `p/`); `photoUrl` queda
    // para imágenes externas, como las de los datos de prueba.
    photo?: string;
  }[];
  // La primera es la portada. Solo se guarda el nombre del archivo; la
  // dirección se compone al responder.
  photos?: { file: string; alt?: Record<string, string> }[];
  isIndependent: boolean;
  status: (typeof restaurantStatuses)[number];
  verification: {
    level: (typeof verificationLevels)[number];
    method?: (typeof verificationMethods)[number];
    lastVerifiedAt?: Date;
  };
  ownerConfirmedAt?: Date;
  // Cuándo se aprobó retirar la ficha a petición suya: desde ahí corre el plazo
  // del borrado definitivo (services/retention.ts).
  retiredAt?: Date;
  isDemo?: boolean;
}

// Fotos del local en la ficha (portada incluida).
export const MAX_PHOTOS = 12;

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

const pointSchema = new Schema(
  {
    type: { type: String, enum: ['Point'], required: true },
    coordinates: {
      type: [Number],
      required: true,
      validate: {
        validator: (v: number[]) =>
          v.length === 2 &&
          v[0]! >= -180 &&
          v[0]! <= 180 &&
          v[1]! >= -90 &&
          v[1]! <= 90,
        message: 'coordinates debe ser [lng, lat] en rango',
      },
    },
  },
  { _id: false },
);

const restaurantSchema = new Schema(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      match: /^[a-z0-9-]+$/,
      maxlength: 80,
    },
    name: { type: String, required: true, minlength: 2, maxlength: 120 },
    // { es: '…', en: '…' }; si falta el idioma, la web usa el de lanzamiento.
    description: { type: Schema.Types.Mixed },
    businessType: { type: String, enum: businessTypes, required: true },
    cuisineTypes: { type: [String], default: [] },
    foodTags: {
      type: [String],
      validate: { validator: (v: string[]) => v.length >= 1 },
    },
    address: {
      street: { type: String, required: true, maxlength: 200 },
      postalCode: String,
      neighborhood: String,
      city: { type: String, required: true },
      cityNames: { type: Schema.Types.Mixed },
      region: String,
      country: { type: String, required: true, match: /^[A-Z]{2}$/ },
    },
    location: { type: pointSchema, required: true },
    contact: {
      phone: String,
      email: String,
      website: { type: String, match: /^https:\/\//i },
      instagram: String,
    },
    openingHours: {
      type: [
        new Schema(
          {
            day: { type: Number, min: 0, max: 6, required: true },
            open: { type: String, match: HHMM, required: true },
            close: { type: String, match: HHMM, required: true },
          },
          { _id: false },
        ),
      ],
      default: [],
    },
    priceRange: { type: Number, enum: [1, 2, 3] },
    menuUrl: { type: String, match: /^https:\/\//i, maxlength: 500 },
    accessibility: { type: [{ type: String, enum: accessibilityFeatures }] },
    signatureDishes: {
      type: [
        new Schema(
          {
            name: { type: String, required: true, maxlength: 80 },
            description: { type: String, maxlength: 160 },
            price: { type: String, maxlength: 20 },
            photoUrl: String,
            photo: String,
          },
          { _id: false },
        ),
      ],
      default: [],
      validate: { validator: (v: unknown[]) => v.length <= 3 },
    },
    photos: {
      type: [
        new Schema(
          {
            file: { type: String, required: true },
            // Texto alternativo por idioma: { es: '…', en: '…' }.
            alt: { type: Schema.Types.Mixed },
          },
          { _id: false },
        ),
      ],
      default: [],
      validate: { validator: (v: unknown[]) => v.length <= MAX_PHOTOS },
    },
    isIndependent: { type: Boolean, required: true },
    status: {
      type: String,
      enum: restaurantStatuses,
      required: true,
      default: 'pending',
    },
    verification: {
      level: { type: String, enum: verificationLevels, default: 'unverified' },
      method: { type: String, enum: verificationMethods },
      lastVerifiedAt: {
        type: Date,
        // Obligatoria en cuanto el local está verificado (spec §2.1).
        required: [
          function (this: { verification?: { level?: string } }) {
            return this.verification?.level !== 'unverified';
          },
          'lastVerifiedAt es obligatoria si el local está verificado',
        ],
      },
    },
    // El negocio sabe que aparece y ha dado el visto bueno.
    ownerConfirmedAt: Date,
    retiredAt: Date,
    isDemo: Boolean,
    // Derivados de arriba, para buscar sin acentos ni mayúsculas.
    cityKey: { type: String, required: true },
    searchText: { type: String, required: true },
  },
  { timestamps: true },
);

// Los campos derivados se recalculan en cada guardado.
restaurantSchema.pre('validate', function () {
  const { name, address } = this;
  if (!address?.city) return;
  this.set('cityKey', normalize(address.city));
  this.set(
    'searchText',
    normalize(
      [name, address.neighborhood, address.city, address.postalCode]
        .filter(Boolean)
        .join(' '),
    ),
  );
});

restaurantSchema.index({ location: '2dsphere' });
restaurantSchema.index({ status: 1, 'address.country': 1, cityKey: 1 });
restaurantSchema.index({ status: 1, foodTags: 1 });

export const Restaurant = model('Restaurant', restaurantSchema);
