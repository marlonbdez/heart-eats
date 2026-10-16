import type { Types } from 'mongoose';
import { ApiError } from '../errors.js';
import { Restaurant } from '../models/restaurant.js';
import { visibleFilter } from './restaurant-query.js';

// El local al que apunta una corrección o una retirada: solo uno publicado y
// visible, igual que en la lectura pública. Si no, 404 (no se distingue «no
// existe» de «aún no es público»).
export async function findTargetRestaurant(slug: string) {
  const record = await Restaurant.findOne(
    { ...visibleFilter, slug },
    { _id: 1 },
  ).lean<{ _id: Types.ObjectId }>();
  if (!record) throw new ApiError(404, 'not_found', 'Local no encontrado');
  return record._id;
}
