import type { Application } from 'express'
import { config } from '../config'

/**
 * Configure Express trust proxy only when TRUST_PROXY is explicitly set.
 * Default (unset): trust proxy remains false — safe for local development.
 *
 * Common production values:
 * - TRUST_PROXY=1  → trust first proxy hop (Render, Railway, single Nginx)
 * - TRUST_PROXY=true → trust all hops (use only when required)
 */
export function configureTrustProxy(app: Application): void {
  const raw = config.trustProxy
  if (!raw) return

  if (raw === 'true') {
    app.set('trust proxy', true)
    return
  }

  if (raw === 'false') {
    app.set('trust proxy', false)
    return
  }

  const hops = Number(raw)
  if (!Number.isNaN(hops)) {
    app.set('trust proxy', hops)
    return
  }

  app.set('trust proxy', raw)
}
