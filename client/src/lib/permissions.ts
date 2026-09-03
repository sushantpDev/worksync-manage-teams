import type { UserRole } from '../types'

export function canCreateProject(role?: UserRole): boolean {
  return role === 'admin' || role === 'manager'
}

export function canManageProject(role?: UserRole): boolean {
  return role === 'admin' || role === 'manager'
}

export function canArchiveProject(role?: UserRole): boolean {
  return role === 'admin'
}

export function canDeleteProject(role?: UserRole): boolean {
  return role === 'admin'
}

export function canViewReports(role?: UserRole): boolean {
  return role === 'admin' || role === 'manager'
}

export function canManageOrganization(role?: UserRole): boolean {
  return role === 'admin'
}

export function canManageTeamMembers(role?: UserRole): boolean {
  return role === 'admin' || role === 'manager'
}
