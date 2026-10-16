// Envío de los enlaces de acceso de moderación (ADR 0007). Las rutas solo
// conocen esta interfaz: el proveedor se cambia sin tocarlas.
export interface LoginLink {
  to: string;
  url: string;
  locale: 'es' | 'en';
}

// Moderación pide más datos a quien propuso (docs/02_API_SPEC.md).
export interface InfoRequest {
  to: string;
  url: string;
  note: string;
  deadline: Date;
  locale: 'es' | 'en';
}

export interface Mailer {
  sendLoginLink(link: LoginLink): Promise<void>;
  sendInfoRequest(request: InfoRequest): Promise<void>;
}

const copy = {
  es: {
    subject: 'Tu enlace para entrar en HeartEats',
    body: (url: string) =>
      `Hola,\n\nEntra en la moderación de HeartEats con este enlace. Caduca en 15 minutos y solo funciona una vez:\n\n${url}\n\nSi no lo has pedido tú, ignora este mensaje.`,
  },
  en: {
    subject: 'Your HeartEats sign-in link',
    body: (url: string) =>
      `Hello,\n\nUse this link to sign in to HeartEats moderation. It expires in 15 minutes and works only once:\n\n${url}\n\nIf you did not request it, ignore this message.`,
  },
} as const;

const infoCopy = {
  es: {
    subject: 'HeartEats necesita un dato más sobre tu propuesta',
    body: ({ url, note, deadline }: InfoRequest) =>
      `Hola,\n\nGracias por tu propuesta. Para revisarla, quien modera necesita saber:\n\n${note}\n\nPuedes responder desde este enlace hasta el ${deadline.toLocaleDateString('es-ES', { timeZone: 'UTC' })}. Solo funciona una vez:\n\n${url}\n\nSi pasa esa fecha sin respuesta, cerraremos la solicitud.`,
  },
  en: {
    subject: 'HeartEats needs one more detail about your suggestion',
    body: ({ url, note, deadline }: InfoRequest) =>
      `Hello,\n\nThank you for your suggestion. To review it, the moderator needs to know:\n\n${note}\n\nYou can reply from this link until ${deadline.toLocaleDateString('en-GB', { timeZone: 'UTC' })}. It works only once:\n\n${url}\n\nIf that date passes without a reply, we will close the request.`,
  },
} as const;

interface ResendOptions {
  apiKey: string;
  from: string;
  // Dónde llegan las respuestas: el correo del dominio, que sí recibe (docs/09_CORREO.md).
  replyTo: string;
  fetchFn?: typeof fetch;
}

// Resend por su API HTTP, sin librería (ADR 0007).
export function resendMailer({
  apiKey,
  from,
  replyTo,
  fetchFn = fetch,
}: ResendOptions): Mailer {
  async function send(to: string, subject: string, text: string) {
    const res = await fetchFn('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: replyTo,
        subject,
        text,
      }),
    });
    // Solo el estado: la respuesta podría repetir la dirección.
    if (!res.ok) throw new Error(`Resend respondió ${res.status}`);
  }

  return {
    async sendLoginLink({ to, url, locale }) {
      const { subject, body } = copy[locale];
      await send(to, subject, body(url));
    },
    async sendInfoRequest(request) {
      const { subject, body } = infoCopy[request.locale];
      await send(request.to, subject, body(request));
    },
  };
}

// Solo desarrollo: escribe el enlace en la consola, sin la dirección.
export const consoleMailer: Mailer = {
  async sendLoginLink({ url }) {
    console.log(`Enlace de acceso (solo desarrollo): ${url}`);
  },
  async sendInfoRequest({ url }) {
    console.log(`Enlace de respuesta (solo desarrollo): ${url}`);
  },
};
