import { sessionDelete, sessionGet, sessionPost } from '../api';
import type {
  AuditEntity,
  AuditPage,
  Retired,
  StaffInvite,
  StaffMember,
} from '../types';

// Administración (solo `admin`; docs/02_API_SPEC.md): quién modera, lo
// retirado que espera su borrado y el registro de lo que se ha hecho.

export async function getStaff(): Promise<StaffMember[]> {
  return (await sessionGet<{ items: StaffMember[] }>('/users')).items;
}

// Alta por invitación: no se envía nada, la persona pide su enlace de acceso.
// Si estaba de baja, se repone con el ámbito nuevo.
export async function inviteStaff({
  email,
  country,
  city,
}: StaffInvite): Promise<StaffMember> {
  return sessionPost<StaffMember>('/users', {
    email,
    moderationScope: [city ? { country, city } : { country }],
  });
}

// Baja, no borrado: sus acciones siguen en el registro.
export async function disableStaff(id: string) {
  await sessionDelete(`/users/${id}`);
}

const AUDIT_PAGE = 50;

export async function getAudit(
  entity?: AuditEntity,
  cursor?: string,
): Promise<AuditPage> {
  return sessionGet<AuditPage>('/audit', {
    entity,
    cursor,
    limit: AUDIT_PAGE,
  });
}

// Lo retirado que está a la espera de borrarse, con el día en que se borrará.
export async function getRetired(): Promise<Retired> {
  return sessionGet<Retired>('/retired');
}

// Devuelve una ficha retirada por error. Las historias no se restauran.
export async function restoreListing(id: string) {
  await sessionPost(`/retired/listings/${id}/restore`);
}
