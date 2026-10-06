# 07 · Verificación y moderación

> **Estado:** borrador v0.1 · Fase 0 · Base: §10 de `00_HANDOFF.md`

## Principio

Nada se publica sin que una persona lo haya revisado y sin que el propio negocio lo confirme. El valor del mapa es que cada punto sea de fiar.

## Ciclo de una propuesta

```
Propuesta (F2) → Filtro automático → Revisión humana → Contacto con el negocio → Decisión → Publicada
   pending            pending            pending              pending          approved/rejected   published
```

1. **Propuesta.** Se guarda como `Suggestion` con estado `pending`. No es pública.
2. **Filtro automático.** Honeypot, rate limit, validación de campos, detección de duplicados (mismo nombre o dirección/ubicación cercana).
3. **Revisión humana.** El moderador comprueba:
   - **Existencia:** web, redes, mapa.
   - **Independencia:** no es gran cadena ni franquicia corporativa (ver criterio abajo).
   - **Equipo inclusivo:** enlace aportado, noticias, web propia, convenios con centros especiales de empleo, referencias de entidades del sector.
4. **Contacto con el negocio** por canal oficial (teléfono o correo del dominio oficial). Se confirma que quiere aparecer y se le ofrece F3 (nivel de información del equipo y consentimientos).
5. **Decisión:** aprobar (fija nivel y método de verificación), pedir más información, o rechazar con motivo.
6. **Registro.** Toda acción queda en `AuditLog`.

## Niveles de insignia

| Nivel | Significado | Quién lo asigna |
|---|---|---|
| 🟢 Verificado (`admin`) | Visita presencial, llamada o documentación contrastada | Moderador/a |
| 🟡 Confirmado (`community`) | Confirmado por el propio negocio con evidencia, o por varias personas independientes | Negocio / comunidad |
| ⚪ Sin verificar (`unverified`) | Propuesto, pendiente | Nadie aún |

**Decisión (2026-10-06):** en el MVP solo se publican fichas **verificadas (🟡 o 🟢)**. El nivel ⚪ es interno y no aparece en el mapa, para evitar "inclusion-washing". **El negocio da siempre el último sí** antes de que su ficha se publique.

## Métodos de verificación (por solidez)

1. Visita presencial.
2. Confirmación directa del negocio (llamada o correo al dominio oficial).
3. Documentación (convenios, certificaciones, comunicados oficiales).
4. Referencias de entidades del sector.

## Criterio de exclusión de cadenas

Se aceptan negocios independientes y proyectos con impacto social. Se rechazan grandes cadenas y franquicias corporativas. Los casos límite (cooperativas, franquicias sociales, grupos pequeños) se documentan aquí a medida que aparezcan.

## Mantenimiento

- Cada ficha muestra nivel, método y fecha de la última verificación.
- Las fichas con verificación de más de 12 meses se marcan para revisión.
- Cualquiera puede sugerir una corrección o la retirada de una ficha; el negocio puede pedir cambios o su baja en cualquier momento.

## Escala

1. Marlon verifica los primeros 15–20 locales de Madrid (≈5–10 min por propuesta).
2. Se incorporan moderadores locales por ciudad.
3. Los verificadores de confianza pueden pre-aprobar.
4. Para expansión internacional: alianzas con asociaciones locales.

## Privacidad en la moderación

- Las propuestas de terceros **no incluyen datos de personas del equipo**. Si alguien los escribe, se descartan al revisar.
- Los datos de contacto de quien propone son privados y solo para seguimiento.

## Preguntas abiertas

1. ❓ Plazo objetivo de respuesta a una propuesta (propuesta: 14 días).
2. ❓ Criterio para ascender a moderador/a local.
