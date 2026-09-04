const ACCESS_TOKEN_KEY = 'worksync_access_token'
const REFRESH_TOKEN_KEY = 'worksync_refresh_token'

if (typeof window !== 'undefined') {
  localStorage.removeItem(REFRESH_TOKEN_KEY)
}

export const tokenStorage = {
  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY)
  },

  setAccessToken(accessToken: string): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
  },

  clear(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
  },

  hasSession(): boolean {
    return Boolean(this.getAccessToken())
  },
}
