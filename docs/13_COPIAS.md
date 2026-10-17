# 13 · Copias de seguridad

> Estado a 2026-10-17. Atlas M0 no hace copias automáticas (ADR 0005), así que las hacemos nosotros.

## Cómo funciona

- **Qué:** `.github/workflows/backup.yml`. Cada domingo (03:17 UTC) y a mano desde *Actions → Copia de seguridad → Run workflow*.
- **Qué se copia:** toda la base de datos, **menos** `sessions` y `logintokens` (caducan solos y en una copia solo serían un riesgo).
- **Cifrado:** la copia se cifra con [age](https://age-encryption.org) antes de salir de GitHub, con una **clave pública**. Solo quien tenga la clave privada puede abrirla. Los datos incluyen correos de contacto (`08_PRIVACIDAD_LEGAL.md`).
- **Dónde:** bucket privado de R2, carpeta `backups/`, con un nombre por fecha: `hearteats-2026-10-18.archive.gz.age`.
- **Cuántas:** 4 semanas. Lo hace una regla de ciclo de vida del bucket (borrar lo de `backups/` con más de 28 días), no el flujo.
- **Si falla:** GitHub envía un correo a quien tiene el repo. Una semana sin copia es lo máximo que se pierde.

## Puesta en marcha (una sola vez)

1. **Clave de cifrado** (en tu Mac, no en el repo):

   ```bash
   brew install age
   age-keygen -o heart-eats-backup.key
   ```

   Imprime una línea `Public key: age1…`: esa es la que va a GitHub. El archivo `heart-eats-backup.key` es la **clave privada**: guárdala en tu gestor de contraseñas y en un segundo sitio (si se pierde, las copias no se pueden abrir). No se sube a ningún sitio.

2. **R2** (panel de Cloudflare):
   - *R2 → Create bucket*, privado, jurisdicción UE si la ofrece.
   - En el bucket, *Settings → Object lifecycle rules → Add rule*: prefijo `backups/`, borrar a los 28 días.
   - *R2 → Manage API tokens → Create API token*: permiso *Object Read & Write*, limitado a ese bucket. Apunta el *Access Key ID*, el *Secret Access Key* y el *Account ID* (está en la barra lateral de R2).

3. **Secretos del repo** (*GitHub → Settings → Secrets and variables → Actions → New repository secret*):

   | Secreto | Valor |
   |---|---|
   | `MONGODB_URI` | La cadena de Atlas. Mejor con un usuario de solo lectura (rol *read* sobre `hearteats`) |
   | `BACKUP_AGE_RECIPIENT` | La clave pública `age1…` |
   | `R2_ACCOUNT_ID` | El Account ID de Cloudflare |
   | `R2_ACCESS_KEY_ID` | Del token de R2 |
   | `R2_SECRET_ACCESS_KEY` | Del token de R2 |
   | `R2_BUCKET` | El nombre del bucket |

4. **Primera copia:** *Actions → Copia de seguridad → Run workflow*. Debe acabar en verde y listar el archivo.

## Restaurar (y comprobar que sirve)

Hazlo sobre una base **de pruebas**, nunca sobre producción por probar. Con Docker no hace falta instalar nada: el comando de abajo es el que se usó el 2026-10-18 (ver el historial).

```bash
docker run -d --rm --name he-restore-test mongo:8.0
age -d -i ~/hearteats-backup.key ~/Downloads/backups_hearteats-AAAA-MM-DD.archive.gz.age \
  | docker exec -i he-restore-test mongorestore --gzip --archive \
      --nsFrom 'hearteats.*' --nsTo 'hearteats_prueba.*'
docker exec he-restore-test mongosh --quiet hearteats_prueba --eval 'db.getCollectionNames().forEach(c => print(c, db[c].countDocuments()))'
docker stop he-restore-test   # al pararlo se borra, con todos los datos
```

La versión con la CLI de S3 y `mongorestore` instalado es esta:

```bash
# 1. Descargar (R2 es compatible con la CLI de S3)
aws s3 cp s3://BUCKET/backups/hearteats-AAAA-MM-DD.archive.gz.age . \
  --endpoint-url https://CUENTA.r2.cloudflarestorage.com

# 2. Descifrar con la clave privada
age -d -i heart-eats-backup.key hearteats-AAAA-MM-DD.archive.gz.age > copia.archive.gz

# 3. Restaurar en una base de pruebas
mongorestore --uri "mongodb://127.0.0.1:27017" --gzip --archive=copia.archive.gz \
  --nsFrom 'hearteats.*' --nsTo 'hearteats_prueba.*'
```

Después se ve que están los locales (`db.restaurants.countDocuments()`). Anota aquí la fecha de la última restauración de prueba.

Para restaurar en producción tras un desastre: se para la API (o se cambia `MONGODB_URI`), se restaura sobre una base nueva y se apunta la API a ella.

## Comprobación rápida de que una copia se abre

Sin restaurar nada: se descarga el `.age` desde el panel de R2 (el navegador le añade `backups_` al nombre) y se mira qué colecciones lleva.

```bash
age -d -i ~/hearteats-backup.key ~/Downloads/backups_hearteats-AAAA-MM-DD.archive.gz.age | gunzip | strings | grep -E "^(restaurants|users|suggestions|teams|auditlogs)$" | sort -u
```

Si no sale nada, la copia o la clave no valen.

## Historial de comprobaciones

| Fecha | Qué se hizo | Resultado |
|---|---|---|
| 2026-10-17 | Primera copia lanzada a mano; descifrada con la clave y revisadas las colecciones | Bien: `restaurants`, `users` y `auditlogs`, sin sesiones ni enlaces de acceso |
| 2026-10-18 | **Restauración completa** de esa copia en un MongoDB 8 local (Docker), renombrando la base a `hearteats_prueba` | Bien: 18 documentos restaurados, 0 fallos, con índices (7 locales, 5 equipos, 1 solicitud, 1 usuario, 4 líneas de auditoría). El contenedor se borró al acabar |

## Qué no cubre

- Las fotos (cuando existan) viven en R2, no en la base de datos; se decidirá aparte si se copian.
- Una copia semanal puede perder hasta 7 días de datos. Si no basta, se sube a diaria (cambiar el `cron`) o se paga el plan de Atlas con copias automáticas (`06_COSTES.md`).
