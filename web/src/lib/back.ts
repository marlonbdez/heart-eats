// Última pantalla de exploración (mapa o lista, con su búsqueda) vista en esta
// visita. Vive solo en memoria: no se guarda nada en el dispositivo, y al
// recargar se vuelve al mapa.
type Discovery = { view: 'map' | 'list'; query: Record<string, string> };

let last: Discovery = { view: 'map', query: {} };

export const rememberDiscovery = (value: Discovery) => {
  last = value;
};

export const lastDiscovery = () => last;
