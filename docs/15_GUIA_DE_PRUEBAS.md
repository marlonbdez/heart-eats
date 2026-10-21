# 15 · Guía de pruebas

> Para probar HeartEats de principio a fin, en producción (`https://hearteats.org`), con casos que salen bien y casos que **deben** fallar con calma. No hace falta saber programar: cada paso dice qué hacer y qué debería pasar. Lo que no salga como se dice, se anota (ver al final) y se arregla en una PR pequeña.
>
> **Antes de empezar:** producción lleva datos de prueba (todos con «[DEMO]» en el nombre; ver `14_PRODUCCION.md`, «Datos de prueba por todo el mundo»). Si aún no se han cargado, desde `server/`: `npm run seed:stress -- --per-city 15` (pide escribir «cargar»). La web está cerrada a buscadores, así que nadie más la encuentra.

**Qué llevar a mano:** el móvil (lo principal), un ordenador, el correo con el que entras a moderación, y un segundo correo tuyo para hacer de «persona que propone» (no uses `contact@hearteats.org`, que solo recibe).

**Cómo probar en el móvil con otro tamaño:** en el ordenador, abre las herramientas del navegador (F12) y elige un dispositivo de 360 px. Para «sin conexión», pestaña *Network* → *Offline*.

---

## A · La primera visita (público)

| # | Haz | Debería pasar |
|---|---|---|
| A1 | Abre `https://hearteats.org` en una ventana privada | Entra solo en español si tu navegador está en español; en inglés en cualquier otro caso. Se ve un mapa con marcadores y arriba: ☰, el logo, el idioma (ES/EN) y «Proponer un local» |
| A2 | Mira la etiqueta de la zona (a la izquierda del buscador) | Pone una ciudad con locales (la que más tiene). El mapa está encuadrado en ella |
| A3 | Toca un marcador | Sale una tarjeta con el local; la × la cierra; tocar el mapa vacío también |
| A4 | Toca la tarjeta del pin (foto o texto) | Abre la ficha: platos, equipo, horario, verificación, «Cómo llegar». «Volver» te devuelve al mapa en la misma zona |
| A5 | Cambia a «Lista» y vuelve a «Mapa» | Misma zona y misma búsqueda en las dos |

## B · Idioma

| # | Haz | Debería pasar |
|---|---|---|
| B1 | Pulsa el icono de traducir (文A) de la cabecera y elige English | Toda la pantalla pasa a inglés; la dirección cambia a `/en…` |
| B2 | Cierra la ventana y vuelve a abrir `https://hearteats.org` | Entra en inglés: se acuerda de tu elección |
| B3 | Vuelve a español y recarga | Sigue en español |
| B5 | Abre el menú ☰: en «Idioma» y «Tema» elige otra opción | El idioma cambia (y se acuerda); el tema también. Cada ajuste lleva su icono y todo cabe a 320 px |
| B4 | Mira las ciudades de otros alfabetos en el selector de zona | En español salen «Tokio», «Seúl»… y en inglés «Tokyo», «Seoul» (solo en los de prueba que ya llevan nombres) |

## C · Dónde estoy mirando (zona y mapa)

| # | Haz | Debería pasar |
|---|---|---|
| C1 | Pulsa la etiqueta de la zona | Se abre «¿Dónde?» con países y ciudades que tienen locales, con su número |
| C2 | Escribe «tokio», luego «東京», luego «japon» | Las tres encuentran Tokio (los acentos y las mayúsculas no importan) |
| C3 | Elige otra ciudad | El mapa se va a ella; la dirección lleva `?country=…&city=…`; los marcadores son los suyos |
| C4 | Aleja el mapa con el «–» o pellizcando hasta ver varias ciudades | Aparecen los locales de otras ciudades al soltar. Si hay muchísimos: «Hay más locales aquí. Acerca el mapa…» |
| C5 | Arrastra el mapa hasta el mar (sin locales) | Dice «No hay locales publicados en esta parte del mapa» |
| C6 | Mientras exploras, abre el selector | Pone la ciudad más cercana al centro del mapa |
| C7 | Elige la ciudad en la que ya estabas | El mapa vuelve a ella |
| C8 | **Fallo a propósito:** abre `https://hearteats.org/es?country=FR&city=nada` | Se ignora la zona inventada y entra en la ciudad por defecto, sin error |
| C9 | **Fallo a propósito:** modo sin conexión y mueve el mapa | Aviso «No hemos podido cargar los datos» con «Reintentar»; los marcadores que había se quedan. Al volver la conexión, «Reintentar» funciona |

## D · Buscar y filtrar

| # | Haz | Debería pasar |
|---|---|---|
| D1 | Escribe «piz» | Sugiere «Pizza» como categoría; al tocarla, se filtra |
| D2 | Escribe el nombre de un local de prueba | Solo ese; el mapa se encuadra en él |
| D3 | Escribe algo que no existe («zzzz») | Mensaje tranquilo, con «Quitar filtros» y «Proponer un local» |
| D4 | «Quitar filtros» | Vuelve a la zona entera |
| D5 | Recarga con una búsqueda hecha | La búsqueda y la zona siguen en la dirección (se puede compartir) |
| D6 | En el ordenador, con ratón, mira la fila de categorías | Solo salen las que tienen locales en la zona; una flecha › al final y, tras usarla, ‹ al principio; sin botón «Más» |
| D7 | En el móvil, desliza la fila de categorías | Se desliza con el dedo; un degradado en el borde avisa de que hay más y no hay flechas |

## E · «Cerca de mí»

| # | Haz | Debería pasar |
|---|---|---|
| E1 | Abre el selector «¿Dónde?» y elige **«Cerca de mí»** (la primera opción), o pulsa la **mirilla** del mapa, y concede el permiso | Si hay una ciudad con locales a menos de 60 km, te lleva a ella y la lista sale ordenada por distancia. Si no: «Aún no hay locales cerca de ti. Seguimos donde estabas.» |
| E2 | Repite y **deniega** el permiso | Mensaje explicando cómo activarlo; la web sigue donde estaba |
| E2b | Con la ubicación compartida, vuelve a pulsar la mirilla tras mover el mapa; luego elige una ciudad en el selector | La mirilla trae el mapa de vuelta a ti; al elegir una ciudad se deja de lado tu ubicación y desaparece el orden por distancia |
| E3 | Mira qué se guarda | Nada: «Solo se usa en tu navegador… no se guarda ni se envía.» |

## F · Proponer, corregir, retirar, contar el equipo (los envíos)

Usa tu segundo correo en «Tu correo» cuando lo pida. Pon siempre «[DEMO]» al principio del nombre de lo que propongas, para poder borrarlo luego.

| # | Haz | Debería pasar |
|---|---|---|
| F1 | «Proponer un local»: en el paso 1 pulsa «Continuar» sin escribir nada | Avisa con calma de lo que falta; no avanza |
| F2 | Rellena los 4 pasos con «[DEMO] Mi prueba», una dirección real, una categoría y un plato | Pantalla «¡Gracias por proponerlo!» |
| F3 | Empieza otra propuesta, escribe algo y cierra la pestaña; vuelve | «Hemos recuperado el borrador…»; «Empezar de cero» lo borra. El borrador no guarda el correo |
| F4 | Abre una ficha → «Sugerir una corrección» → «El horario»/«Ha cerrado» → envía | «¡Gracias por avisarnos!» |
| F5 | «Soy de un negocio» desde una ficha: elige «Solo cifras» y envía | «¡Gracias!»; no pide fotos |
| F6 | «Pedir una retirada» desde el menú | «Petición recibida»; dice que te escribirán para confirmar que eres tú |
| F7 | **Fallo a propósito:** escribe un correo inválido (`a@`) | Lo avisa en el campo, sin borrar lo demás |
| F8 | **Fallo a propósito:** envía con la conexión cortada | «No hemos podido enviar… puedes intentarlo de nuevo»; no se pierde lo escrito |

## G · Moderación (necesita tu correo de administración)

| # | Haz | Debería pasar |
|---|---|---|
| G1 | Entra en `https://hearteats.org/es/moderation` y pide el enlace con tu correo | Mensaje igual exista o no la cuenta. Llega un correo de `mail.hearteats.org` (mira también spam) |
| G2 | Abre el enlace | Entras a la cola. Vale 15 minutos y **una vez**: ábrelo otra vez y debe decir que no es válido |
| G3 | **Fallo a propósito:** pide el enlace con un correo que no está dado de alta | Mismo mensaje; no llega nada |
| G4 | Mira «Pendientes (n)» | Salen tus envíos de F2, F4, F5 y F6 con el correo enmascarado |
| G5 | Abre tu propuesta de F2 | Hay pin (si falló la geocodificación, te pide colocarlo a mano) y avisos de posibles duplicados |
| G6 | «Pedir más información» con una nota | Llega un correo a tu segundo correo con un enlace a «Responder a Moderación» |
| G7 | Abre ese enlace, responde, envía; ábrelo otra vez | La primera vez: «¡Gracias por responder!». La segunda: «Este enlace ya no es válido» |
| G8 | Vuelve a la cola | La propuesta está otra vez en «Pendientes», con la respuesta |
| G9 | «Aprobar y publicar» sin marcar las comprobaciones | Se niega y dice qué falta |
| G10 | Marca comprobaciones, nivel y método, y aprueba | «Aprobada y publicada»; en el mapa aparece el local; llega un correo de aviso a tu segundo correo |
| G11 | Aprueba la corrección (F4) y la retirada (F6) | Los cambios se ven en la ficha; la retirada la oculta al momento |
| G12 | Rechaza el equipo (F5) con motivo | «Rechazada»; en «Resueltas» queda con el motivo |
| G13 | Baja por la pantalla de moderación (solo administración): «Quién modera» y «Registro de auditoría» | El registro enseña cada decisión con quién la tomó, sin textos de historias ni correos. En «Quién modera», invita a un segundo correo tuyo y comprueba que puede entrar y que no ve esas dos secciones |
| G13b | Como administrador, abre «Retiradas» | Lista las fichas e historias pendientes de borrar con su fecha («Se borra el … (en N días)»). De las historias solo sale el local y «historia N», nunca su texto; no tienen botón. Pulsa «Restaurar» en una ficha de prueba y confirma: avisa «vuelve a verse», desaparece de la lista y reaparece en el mapa. Un moderador no ve esta sección |
| G14 | Pulsa «Salir» y luego «Atrás» en el navegador | No debe verse la cola; pide entrar de nuevo |

## H · Fichas y rutas que no existen

| # | Haz | Debería pasar |
|---|---|---|
| H1 | Abre `https://hearteats.org/es/place/no-existe` | «No encontramos este local» con «Volver al mapa» |
| H2 | Abre `https://hearteats.org/es/lo-que-sea` | Página de «no encontrada» con salida clara |
| H3 | Abre `https://hearteats.org/es/moderation` sin sesión | Pide entrar; no enseña nada |
| H4 | Abre una ficha de un local archivado o pendiente de prueba | No existe para el público (mismo mensaje que H1) |

## I · Móvil, accesibilidad y modo oscuro

Repite A, C y F a **320 px** y a **390 px**, y una vez con la letra del móvil al máximo.

- Nada se sale por los lados ni se solapa (el selector, el buscador, «Cerca de mí», el aviso de «acerca el mapa»).
- Todo botón se puede pulsar con el pulgar sin tocar otro.
- Con teclado (Tab, Enter, Esc): se llega a todo, se ve dónde está el foco, Esc cierra el selector de zona y la tarjeta.
- Modo oscuro del sistema: se lee todo, también el mapa.
- **Poca cobertura:** en el móvil, con el modo avión un momento o la red limitada de las herramientas del navegador, toca una tarjeta, cambia de zona y envía un formulario. Debe verse siempre que algo está pasando (barra fina, «Cargando…», botón «Enviando…» con su rueda) y, pasados unos segundos, un aviso de paciencia. Un botón pulsado se oscurece mientras se mantiene el dedo.
- Con un lector de pantalla (VoiceOver o TalkBack), prueba A3 y C1: el mapa dice cuántos locales hay y los marcadores tienen nombre.

## J · Qué mirar mientras se prueba la carga (con los datos de prueba)

No hay que ser exacto; es para saber si algo va lento.

- **Mapa:** a un zoom de ciudad, los marcadores aparecen en menos de ~2 s. Si tardan, anota la ciudad y qué hacías.
- **Alejar mucho:** debe pedir acercar, no colgar el navegador.
- **API dormida:** Railway no duerme (plan Hobby), pero tras un despliegue la primera petición puede tardar. Anótalo si pasa a menudo.
- **Atlas:** panel de Atlas → *Metrics*. Si las operaciones o la latencia suben mucho con tu uso, es la señal para plantear la caché (aplazada a propósito; ver `05_ROADMAP.md`).
- **Registros de la API:** Railway → *Logs* (7 días). Errores en rojo que no entiendas, anótalos.

## Cómo anotar lo que falle

Una línea por problema, en una lista (puede ser en las notas del móvil):

```
[Número de la guía] qué hice → qué pasó → qué esperaba · dispositivo · idioma
Ejemplo: C4 alejé el mapa en Sevilla → se quedó con 3 marcadores → esperaba ver Madrid · iPhone 14 · ES
```

Con eso basta para arreglarlo. Las capturas ayudan si hay algo visual.

## Al terminar

- Quita lo que has creado tú con «[DEMO]» (o déjalo para la siguiente ronda: se borra todo antes de abrir; ver `14_PRODUCCION.md` §9, pendiente 3).
- Si tocaste datos reales («El mesón de Lola»), comprueba que siguen bien.
- La web **sigue cerrada a buscadores** hasta el lanzamiento.
