const INVITE_RETURN_KEY = 'worksync_invite_return'

export const inviteStorage = {
  setReturnPath(path: string): void {
    if (path.startsWith('/invite/')) {
      sessionStorage.setItem(INVITE_RETURN_KEY, path)
    }
  },

  getReturnPath(): string | null {
    const path = sessionStorage.getItem(INVITE_RETURN_KEY)
    return path?.startsWith('/invite/') ? path : null
  },

  clear(): void {
    sessionStorage.removeItem(INVITE_RETURN_KEY)
  },
}
