const ORG_ID_KEY = 'worksync_organization_id'

export const orgStorage = {
  getOrganizationId(): string | null {
    return localStorage.getItem(ORG_ID_KEY)
  },

  setOrganizationId(organizationId: string): void {
    localStorage.setItem(ORG_ID_KEY, organizationId)
  },

  clear(): void {
    localStorage.removeItem(ORG_ID_KEY)
  },
}
