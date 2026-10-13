import { Router, type Response } from 'express';
import {
  businessTypes,
  cuisineTypes,
  disabilityTypes,
  foodTags,
} from '../catalog.js';
import { ApiError } from '../errors.js';
import { Restaurant, type RestaurantRecord } from '../models/restaurant.js';
import { Team, type TeamRecord } from '../models/team.js';
import { toPublicRestaurant } from '../services/restaurant-public.js';
import {
  GEOJSON_MAX_POINTS,
  buildFilter,
  encodeCursor,
  parseListQuery,
  visibleFilter,
  type ListQuery,
} from '../services/restaurant-query.js';

export const restaurantsRouter = Router();

// Lecturas públicas: caché corta para que muchas visitas compartan respuesta.
const cacheable = (res: Response) =>
  res.set('Cache-Control', 'public, max-age=60');

// Con «near» el orden lo da la distancia; sin él, por slug (estable).
const sorted = (query: ListQuery): Record<string, 1> =>
  query.near ? {} : { slug: 1 };

// Locales de una zona, paginados. Sin el equipo: eso va solo en la ficha.
restaurantsRouter.get('/restaurants', async (req, res) => {
  const query = parseListQuery(req.query);

  const records = await Restaurant.find(buildFilter(query))
    .sort(sorted(query))
    .skip(query.offset)
    .limit(query.limit + 1)
    .lean<RestaurantRecord[]>();

  const hasMore = records.length > query.limit;
  const now = new Date();
  cacheable(res).json({
    items: records
      .slice(0, query.limit)
      .map((record) => toPublicRestaurant(record, undefined, now)),
    ...(hasMore
      ? { nextCursor: encodeCursor(query.offset + query.limit) }
      : {}),
  });
});

// Lo mínimo para pintar el mapa: un punto por local.
restaurantsRouter.get('/restaurants/geojson', async (req, res) => {
  const query = parseListQuery(req.query);

  const records = await Restaurant.find(buildFilter(query), {
    slug: 1,
    name: 1,
    foodTags: 1,
    location: 1,
  })
    .sort(sorted(query))
    .limit(GEOJSON_MAX_POINTS + 1)
    .lean<
      Pick<RestaurantRecord, 'slug' | 'name' | 'foodTags' | 'location'>[]
    >();

  const truncated = records.length > GEOJSON_MAX_POINTS;
  cacheable(res).json({
    type: 'FeatureCollection',
    features: records.slice(0, GEOJSON_MAX_POINTS).map((r) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: r.location.coordinates },
      properties: { slug: r.slug, name: r.name, foodTags: r.foodTags },
    })),
    truncated,
  });
});

// Ficha de un local, con su equipo ya filtrado por privacidad.
restaurantsRouter.get('/restaurants/:slug', async (req, res) => {
  const record = /^[a-z0-9-]{1,80}$/.test(req.params.slug)
    ? await Restaurant.findOne({
        ...visibleFilter,
        slug: req.params.slug,
      }).lean<RestaurantRecord>()
    : null;
  if (!record) throw new ApiError(404, 'not_found', 'Local no encontrado');

  const team = await Team.findOne({
    restaurantId: record._id,
  }).lean<TeamRecord>();
  cacheable(res).json(toPublicRestaurant(record, team));
});

// Catálogos para los filtros.
restaurantsRouter.get('/meta/filters', (_req, res) => {
  cacheable(res).json({
    foodTags,
    cuisineTypes,
    businessTypes,
    inclusionTypes: disabilityTypes,
  });
});
