# 01 · Especificación de datos

> **Estado:** borrador v0.1 para revisión · Fase 0
> Base: §8 de `00_HANDOFF.md`. Los puntos marcados con ❓ son decisiones o dudas abiertas.

## 1. Principios

1. **Minimización:** guardar el mínimo de datos personales; preferir agregados.
2. **Internacional desde el día 1:** país/región/ciudad en toda dirección; textos con i18n.
3. **Trazabilidad:** todo cambio en una ficha queda en `AuditLog`.
4. **Datos de discapacidad = categoría especial (art. 9 RGPD):** cualquier dato identificable requiere consentimiento registrado y revocable.
5. **Lectura pública sin datos personales.**

## 2. Colecciones

### 2.1 `Restaurant`

| Campo | Tipo | Req. | Validación / notas |
|---|---|---|---|
| `_id` | ObjectId | ✔ | |
| `slug` | string | ✔ | único, `^[a-z0-9-]+$`, ≤ 80 |
| `name` | string | ✔ | 2–120 |
| `description` | `Record<locale,string>` | | cada valor ≤ 1000; claves `es`, `en`… |
| `cuisineTypes` | string[] | ✔ | ≥1, valores del catálogo `cuisine` |
| `businessType` | enum | ✔ | `restaurant`, `cafe`, `bar`, `bakery`, `catering`, `social_project` |
| `address.street` | string | ✔ | ≤ 200 |
| `address.postalCode` | string | | |
| `address.neighborhood` | string | | |
| `address.city` | string | ✔ | |
| `address.region` | string | | |
| `address.country` | string | ✔ | ISO 3166-1 alpha-2 |
| `location` | GeoJSON Point | ✔ | `coordinates: [lng, lat]`, rangos válidos |
| `contact.phone/email/website/instagram` | string | | `website` URL https; `email` formato válido |
| `openingHours` | `{day 0-6, open, close}[]` | | `HH:mm`; permitir varios tramos por día ❓ cierre tras medianoche |
| `signatureDishes` | `{name, description?, photoUrl?}[]` | ✔ | 1–3 platos estrella; `name` ≤ 80, `description` ≤ 160 |
| `foodTags` | string[] | ✔ | ≥1, catálogo `foodTag` (pizza, pasteles, café, tapas, menú del día, panadería…) usado en los filtros públicos |
| `inclusionTypes` | enum[] | | **Opcional y no filtrable públicamente.** Solo se muestra en "El Equipo" (nivel medio o máximo) si el negocio lo decide. ≥1: `intellectual_disability`, `physical_disability`, `hearing_impairment`, `visual_impairment`, `mental_health`, `autism_spectrum`, `other` |
| `teamVisibilityLevel` | enum | ✔ | `minimal` (defecto), `medium`, `full` |
| `isIndependent` | boolean | ✔ | regla de exclusión de cadenas |
| `status` | enum | ✔ | `draft`, `pending`, `published`, `rejected`, `archived` |
| `verification.level` | enum | ✔ | `unverified` (defecto), `community`, `admin` |
| `verification.lastVerifiedAt` | Date | | obligatoria si level ≠ `unverified` |
| `verification.verifiedBy` | ObjectId→User | | |
| `verification.method` | enum | | `visit`, `call`, `documentation`, `owner_confirmed` |
| `verification.evidence[]` | `{type,url,note}` | | |
| `ownerConfirmedAt` | Date | | el negocio sabe que aparece (§11.5 handoff) |
| `createdAt`, `updatedAt` | Date | ✔ | |

**Reglas de negocio**
- Solo `status = published` es visible en la API pública.
- Una ficha propuesta por terceros sin `ownerConfirmedAt` solo muestra información pública verificable; no se muestra el bloque Equipo detallado.
- Fichas con `lastVerifiedAt` > 12 meses se marcan `needsReview` (campo calculado, no almacenado).

### 2.2 `Team` (1:1 con `Restaurant`)

| Campo | Tipo | Req. | Notas |
|---|---|---|---|
| `restaurantId` | ObjectId | ✔ | único |
| `visibilityLevel` | enum | ✔ | debe coincidir con `Restaurant.teamVisibilityLevel` (fuente de verdad: `Team`; ❓ evitar duplicar y dejarlo solo aquí) |
| `summary.totalStaff` | int ≥1 | ✔ | |
| `summary.staffWithDisability` | int ≥0 | ✔ | ≤ `totalStaff` |
| `areas[]` | enum[] (`kitchen`, `dining`, `bar`, `workshop`, `delivery`) | nivel `medium`+ | Opcional. Áreas de trabajo del equipo, **sin cruzarlas** con los tipos de discapacidad |
| `disabilityTypes[]` | enum[] (los de `inclusionTypes`) | nivel `medium`+ | Opcional. Sin identificar a nadie |
| `stories[]` | ver abajo | nivel `full` | |
| `updatedAt` | Date | ✔ | |

`stories[]`: `displayName` (puede ser seudónimo), `role`, `storyText` (≤ 2000), `photoUrl?`, `consentRecordedAt`, `consentBy` (persona o representante legal), `revocable: true`, `revokedAt?`.

**Reglas**
- Una historia sin `consentRecordedAt` no se guarda.
- Si `revokedAt` existe, la historia se oculta y los datos se eliminan en un plazo máximo definido en la política de privacidad ❓ (propuesta: 7 días).
- **Umbral de privacidad:** si `totalStaff` < 5 ❓, solo se publica la cifra: no se muestran `areas`, `disabilityTypes` ni `stories` (la API los ignora y el formulario no los pide).
- **Áreas y tipos van por separado**, nunca cruzados («una persona sorda en cocina» podría identificar a alguien). Por eso no hay `count` por área ni por tipo.

### 2.3 `Suggestion`

`type` (`new` | `edit`), `targetRestaurantId?` (obligatorio si `edit`), `payload` (subconjunto validado de `Restaurant`), `submittedBy?` (User o anónimo), `contactEmail?` (solo para seguimiento; no público), `evidence[]`, `status` (`pending` | `approved` | `rejected`), `moderatorNotes`, `reviewedBy`, `createdAt`, `reviewedAt`.

### 2.4 `User`

`email` (único), `role` (`community` | `moderator` | `admin`), `moderationScope` (`{country, city?}[]`), `verificationScore`, `createdAt`. Sin otros datos personales.

### 2.5 `AuditLog`

`entity` (`restaurant`|`team`|`suggestion`|`user`), `entityId`, `action`, `actor` (User o `system`), `diff` (antes/después, sin datos sensibles de historias), `at`.

## 3. Índices

| Colección | Índice | Uso |
|---|---|---|
| Restaurant | `location` 2dsphere | bbox / near |
| Restaurant | `slug` único | detalle |
| Restaurant | `{status, address.country, address.city}` | listados |
| Restaurant | `{status, foodTags}`, `{status, cuisineTypes}` | filtros públicos de comida |
| Restaurant | texto en `name`, `address.neighborhood`, `address.city`; `address.postalCode` | buscador de sitios; los platos se encuentran por `foodTags` ❓ (índice de texto con i18n es limitado) |
| Team | `restaurantId` único | |
| Suggestion | `{status, createdAt}` | cola de moderación |
| User | `email` único | |
| AuditLog | `{entity, entityId, at}` | historial |

## 4. Catálogos controlados

`cuisine`, `foodTag`, `inclusionTypes`, `businessType` y barrios se sirven por `GET /meta/filters`. Se definen en `shared/constants` con clave estable en inglés y etiqueta por idioma.

## 5. Ficha de seed

Los datos semilla son **ficticios** y deben llevar `name` con prefijo `[DEMO]` y flag `isDemo: true` para no confundirse con negocios reales.

## 6. Preguntas abiertas

1. ❓ ¿`teamVisibilityLevel` solo en `Team`? (propuesto)
2. ❓ Umbral de plantilla mínima para nivel `medium` (propuesto 5).
3. ❓ Plazo de borrado tras revocación (propuesto 7 días).
4. ❓ Horarios: tramos múltiples y cierre pasada la medianoche.
5. ❓ Búsqueda de texto: índice nativo de Mongo vs. Atlas Search.
