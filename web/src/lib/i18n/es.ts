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
} as const;
