import type { ChurchRole } from '@/types/models'

export const MANAGER_ROLES: readonly ChurchRole[] = ['church_admin', 'worship_director']

export function isManagerRole(role: ChurchRole): boolean {
  return MANAGER_ROLES.includes(role)
}

export const DEFAULT_MUSICAL_ROLES = [
  'Director de alabanza',
  'Vocalista',
  'Guitarra acústica',
  'Guitarra eléctrica',
  'Bajo',
  'Batería',
  'Teclado',
  'Pastor',
  'Líder',
] as const
