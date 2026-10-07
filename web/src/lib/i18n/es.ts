// Textos de la interfaz en español. Cuando se añada inglés, esto pasa a
// un diccionario por idioma; las pantallas ya consumen claves, no literales.
export const es = {
  app: { name: 'HeartEats', tagline: 'Comer bien, con equipos que suman.' },
  header: {
    openMenu: 'Abrir menú',
    closeMenu: 'Cerrar menú',
    propose: 'Proponer',
    proposeSuffix: ' un local',
    skipToContent: 'Saltar al contenido',
  },
  menu: {
    title: 'Menú',
    groups: {
      navigate: 'Navegar',
      collaborate: 'Colaborar',
      about: 'Sobre HeartEats',
    },
    links: {
      map: 'Mapa',
      list: 'Lista de locales',
      propose: 'Proponer un local',
      correct: 'Corregir un dato',
      business: 'Soy de un negocio',
      what: 'Qué es HeartEats',
      verify: 'Cómo verificamos',
      privacy: 'Privacidad y datos',
      contact: 'Contacto',
    },
    language: 'Idioma',
    soonEnglish: 'English (próximamente)',
  },
  placeholder: {
    title: 'Esta pantalla llega pronto',
    body: 'Seguimos construyendo HeartEats pantalla a pantalla.',
    back: 'Volver al mapa',
  },
  propose: {
    title: 'Proponer un local',
    back: 'Volver al mapa',
    stepOf: (n: number) => `Paso ${n} de 4`,
    steps: ['El local', 'Platos', 'Equipo', 'Enviar'],
    prev: 'Atrás',
    next: 'Continuar',
    send: 'Enviar propuesta',
    sending: 'Enviando…',
    sendError: 'No hemos podido enviar la propuesta. Inténtalo de nuevo.',
    s1: {
      intro:
        'Cuéntanos qué sitio es. Con lo básico basta, el resto lo revisamos nosotros.',
      name: 'Nombre del local',
      nameError: 'Escribe el nombre del local para continuar.',
      street: 'Dirección',
      streetHint: 'Calle y número',
      city: 'Ciudad',
      postalCode: 'Código postal',
      food: '¿Qué tipo de comida?',
      foodHint: '(elige las que apliquen)',
      foodGroup: 'Tipo de comida',
      other: 'Otra',
    },
    s2: {
      intro:
        '¿Qué hay que probar sí o sí? Añade de 1 a 3 platos. Es lo que más ayuda a que la gente se anime a ir.',
      dish: (n: number) => `Plato ${n}`,
      dishName: 'Nombre del plato',
      dishDesc: 'Descripción corta',
      optional: '(opcional)',
      add: '+ Añadir otro plato',
      photos:
        'Las fotos las aporta el propio negocio, o se usan con su permiso. De momento no hace falta subir ninguna.',
    },
    s3: {
      intro:
        'HeartEats reúne negocios independientes cuyo equipo incluye a personas con discapacidad. Ayúdanos a comprobarlo.',
      how: '¿Cómo conoces el negocio?',
      howHint: 'Ej.: voy habitualmente, lo vi en una noticia, trabajo allí…',
      link: 'Un enlace que lo confirme',
      linkHint: '(web, noticia, redes…)',
      linkError:
        'Escribe un enlace válido que empiece por https:// o déjalo vacío.',
      indep: 'Es un negocio independiente (no una gran cadena)',
      noteStrong: 'Importante:',
      note: ' no escribas nombres ni datos de salud de ninguna persona. Si el negocio quiere contar la historia de su equipo, lo hará él mismo, con el consentimiento de cada persona.',
    },
    s4: {
      intro:
        'Por si necesitamos preguntarte algo. Es opcional y nunca se muestra en la web.',
      email: 'Tu correo',
      emailError: 'Escribe un correo válido o déjalo vacío.',
      summary: 'Resumen',
      summaryFallback: 'Tu propuesta',
      noFood: 'Sin tipo de comida indicado',
      consent:
        'Al enviar, aceptas que revisemos la propuesta y la publiquemos si se cumple el criterio de negocio independiente con equipo inclusivo. ',
      privacy: 'Política de privacidad',
    },
    done: {
      title: '¡Gracias por proponerlo!',
      body: (name: string) =>
        `Revisaremos ${name} y, si todo encaja, lo verás en el mapa. Si necesitamos algo más, te escribiremos (solo si nos dejaste tu correo).`,
      back: 'Volver al mapa',
      again: 'Proponer otro local',
    },
  },
} as const;
