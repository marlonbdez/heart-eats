// Fotos de los locales de ejemplo. Son imágenes de dominio público (ver
// photos/LICENCIAS.md), ya reducidas y en WebP, con su miniatura. Los nombres
// de archivo son los que usa el almacén de fotos, así que los locales las
// referencian igual que a una foto subida y aprobada.
import { readFile } from 'node:fs/promises';
import { foodTags } from '../src/catalog.js';
import { contentTypeOf, thumbOf } from '../src/services/photo-keys.js';
import type { PhotoStore } from '../src/services/photo-store.js';

type FoodTag = (typeof foodTags)[number]['key'];

export const demoPhotos = [
  {
    key: 'pizza',
    id: '29e946bd-5b34-4fc4-98c6-a53905bba82e',
    tags: ['pizza', 'italian'],
    alt: {
      es: 'Pizza con tomate, mozzarella fresca y hojas de albahaca, sobre la pala',
      en: 'Pizza with tomato, fresh mozzarella and basil leaves, on the peel',
    },
  },
  {
    key: 'focaccia',
    id: 'b9697f25-6502-47cc-acc5-2319a25c99c7',
    tags: ['italian', 'bakery'],
    alt: {
      es: 'Focaccia dorada con queso y hierbas en un plato blanco',
      en: 'Golden focaccia topped with cheese and herbs on a white plate',
    },
  },
  {
    key: 'breakfast',
    id: 'e9a35774-1170-4a4f-89f9-63df3257f897',
    tags: ['coffee', 'set_menu'],
    alt: {
      es: 'Desayuno en una bandeja: huevo frito, jamón, tostadas y dos cafés',
      en: 'Breakfast tray with a fried egg, ham, toast and two coffees',
    },
  },
  {
    key: 'croquetas',
    id: 'eab7ad8c-41bf-4b1d-aec9-c18a45e1d236',
    tags: ['tapas'],
    alt: {
      es: 'Croquetas doradas en un mostrador',
      en: 'Golden croquettes on a counter',
    },
  },
  {
    key: 'bread',
    id: '225239b1-ecda-4769-bb65-f3df5e8e9e53',
    tags: ['bakery'],
    alt: {
      es: 'Hogaza de masa madre cortada por la mitad sobre una tabla',
      en: 'Sourdough loaf cut in half on a board',
    },
  },
  {
    key: 'burger',
    id: '4c0ad09a-a971-4b01-9b68-435ae9e017b1',
    tags: ['burgers'],
    alt: {
      es: 'Hamburguesa con queso y beicon en un plato azul',
      en: 'Cheeseburger with bacon on a blue plate',
    },
  },
  {
    key: 'tapas',
    id: 'ca871e45-0c01-46be-9a3b-1c0e54917dc4',
    tags: ['tapas'],
    alt: {
      es: 'Tabla redonda con varias tapas sobre un mantel de cuadros rojos',
      en: 'Round board with assorted tapas on a red checked tablecloth',
    },
  },
  {
    key: 'latte',
    id: 'f2eaece8-6f1c-4a43-ab1f-2dcd917b0e4f',
    tags: ['coffee'],
    alt: {
      es: 'Café con leche con un dibujo en la espuma, sobre una mesa de madera',
      en: 'Latte with art in the foam, on a wooden table',
    },
  },
  {
    key: 'pasta',
    id: 'fc30cd00-1b3e-44fe-99fb-87170300dd03',
    tags: ['italian', 'vegetarian'],
    alt: {
      es: 'Pasta con verduras y tomates cherry en una sartén',
      en: 'Pasta with vegetables and cherry tomatoes in a pan',
    },
  },
  {
    key: 'loaf',
    id: '7d039a48-4d68-446f-91a1-6463045c59aa',
    tags: ['bakery'],
    alt: {
      es: 'Hogaza redonda recién horneada sobre una rejilla',
      en: 'Freshly baked round loaf on a rack',
    },
  },
  {
    key: 'chickpeas',
    id: '8f815f93-96ee-47e3-a530-f0854af9ebd0',
    tags: ['vegetarian'],
    alt: {
      es: 'Ensalada de garbanzos con pimiento, aceitunas y pepino',
      en: 'Chickpea salad with pepper, olives and cucumber',
    },
  },
  {
    key: 'ramen',
    id: '275b7079-14c1-446d-8e16-0830b9d990ac',
    tags: ['sushi'],
    alt: {
      es: 'Cuenco de ramen con caldo, brotes de bambú, maíz y edamame',
      en: 'Bowl of ramen with broth, bamboo shoots, corn and edamame',
    },
  },
  {
    key: 'tacos',
    id: 'c9fed221-0ac9-483a-9011-e8cfc7ab8ce1',
    tags: ['set_menu'],
    alt: {
      es: 'Dos tacos con verduras y salsa servidos en papel',
      en: 'Two tacos with vegetables and sauce served on paper',
    },
  },
  {
    key: 'sushi',
    id: 'ee6dcb2b-82ac-4713-b4d6-833253c886b9',
    tags: ['sushi'],
    alt: {
      es: 'Bandejas con variedad de sushi',
      en: 'Trays of assorted sushi',
    },
  },
  {
    key: 'hummus',
    id: '3c0e7f95-b020-4bfb-8cae-551cfb6907c9',
    tags: ['vegetarian'],
    alt: {
      es: 'Cuenco de hummus con pan de pita',
      en: 'Bowl of hummus with pita bread',
    },
  },
  {
    key: 'cake',
    id: 'fda80b33-6885-4293-8edc-276cc48faba9',
    tags: ['desserts'],
    alt: {
      es: 'Porción de tarta de capas con cacao por encima',
      en: 'Slice of layered cake dusted with cocoa',
    },
  },
] as const satisfies readonly {
  key: string;
  id: string;
  tags: readonly FoodTag[];
  alt: { es: string; en: string };
}[];

export type DemoPhotoKey = (typeof demoPhotos)[number]['key'];
type DemoPhoto = (typeof demoPhotos)[number];

const fileOf = ({ id }: DemoPhoto) => `${id}.webp`;
const byKey = (key: string) => {
  const photo = demoPhotos.find((p) => p.key === key);
  if (!photo) throw new Error(`Foto de ejemplo desconocida: ${key}`);
  return photo;
};

// Lo que va en `photos` de un local.
export const photoRef = (photo: DemoPhoto) => ({
  file: fileOf(photo),
  alt: photo.alt,
});

// Las fotos que pegan con esos tipos de comida (si ninguna, todas).
export function photosFor(tags: readonly string[]): readonly DemoPhoto[] {
  const matching = demoPhotos.filter((p) =>
    p.tags.some((tag) => tags.includes(tag)),
  );
  return matching.length > 0 ? matching : demoPhotos;
}

type Doc = Record<string, unknown>;

// En `restaurants.json` los locales piden sus fotos por clave: `demoPhotos`
// (la primera es la portada) y, en cada plato, `demoPhoto`. Aquí se convierten
// en lo que guarda el modelo. Sin almacén de fotos (`include: false`) se quitan:
// apuntarían a archivos que no existen.
export function withDemoPhotos(entry: Doc, include: boolean): Doc {
  const { demoPhotos: keys, signatureDishes, ...rest } = entry;
  const dishes = ((signatureDishes ?? []) as Doc[]).map(
    ({ demoPhoto, ...dish }) => ({
      ...dish,
      ...(include && typeof demoPhoto === 'string'
        ? { photo: fileOf(byKey(demoPhoto)) }
        : {}),
    }),
  );
  return {
    ...rest,
    signatureDishes: dishes,
    ...(include && Array.isArray(keys)
      ? { photos: keys.map((key) => photoRef(byKey(String(key)))) }
      : {}),
  };
}

const read = (name: string) =>
  readFile(new URL(`./photos/${name}`, import.meta.url));

// Sube todas las fotos de ejemplo (con su miniatura) a la parte pública del
// almacén. Se puede repetir: sobrescribe.
export async function publishDemoPhotos(store: PhotoStore) {
  for (const photo of demoPhotos) {
    for (const name of [fileOf(photo), thumbOf(fileOf(photo))]) {
      await store.put(`p/${name}`, await read(name), contentTypeOf(name));
    }
  }
}

// Las borra del almacén. Borrar una que no está no da error.
export async function removeDemoPhotos(store: PhotoStore) {
  for (const photo of demoPhotos) {
    await store.remove(`p/${fileOf(photo)}`);
    await store.remove(`p/${thumbOf(fileOf(photo))}`);
  }
}
