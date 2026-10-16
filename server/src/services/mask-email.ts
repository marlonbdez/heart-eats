// El correo de quien envía nunca sale entero por la API de moderación: solo
// la inicial y el dominio (igual que en la web, web/src/lib/data/outbox.ts).
export function maskEmail(email?: string): string | undefined {
  const mail = email?.trim();
  if (!mail) return undefined;
  const [user, domain] = mail.split('@');
  if (!user || !domain) return undefined;
  return `${user[0]}***@${domain}`;
}
