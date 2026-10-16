// Envío de los enlaces de acceso de moderación (ADR 0007). Las rutas solo
// conocen esta interfaz: el proveedor se cambia sin tocarlas.
export interface LoginLink {
  to: string;
  url: string;
  locale: 'es' | 'en';
}

export interface Mailer {
  sendLoginLink(link: LoginLink): Promise<void>;
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
  return {
    async sendLoginLink({ to, url, locale }) {
      const { subject, body } = copy[locale];
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
          text: body(url),
        }),
      });
      // Solo el estado: la respuesta podría repetir la dirección.
      if (!res.ok) throw new Error(`Resend respondió ${res.status}`);
    },
  };
}

// Solo desarrollo: escribe el enlace en la consola, sin la dirección.
export const consoleMailer: Mailer = {
  async sendLoginLink({ url }) {
    console.log(`Enlace de acceso (solo desarrollo): ${url}`);
  },
};
