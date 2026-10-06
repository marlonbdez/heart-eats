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
  map: {
    label: 'Mapa de locales',
    loadError:
      'No se ha podido cargar el mapa en este dispositivo. Pronto podrás ver los locales en una lista.',
    markerLabel: (name: string) => `${name}, ver vista previa`,
  },
  card: {
    label: 'Vista previa del local',
    close: 'Cerrar vista previa',
    inclusiveSeal: 'Equipo inclusivo',
    signatureDish: 'Plato estrella',
    noPhoto: 'Sin foto',
    verifiedAdmin: 'Verificado',
    verifiedCommunity: 'Confirmado',
    needsReview: 'Pendiente de revisión',
    methods: {
      visit: 'visita presencial',
      call: 'llamada',
      documentation: 'documentación',
      owner_confirmed: 'confirmado por el negocio',
    },
    updated: 'actualizado',
  },
  placeholder: {
    title: 'Esta pantalla llega pronto',
    body: 'Seguimos construyendo HeartEats pantalla a pantalla.',
    back: 'Volver al mapa',
  },
} as const;
