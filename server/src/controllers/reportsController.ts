import type { Response } from 'express'
import type { AuthRequest } from '../middleware/auth'
import type { MembershipRole } from '../models/Membership'
import { buildOrganizationReport, parseReportRange } from '../services/reportsService'

function getRole(req: AuthRequest): MembershipRole {
  return req.membership?.role ?? req.user!.role
}

export async function getReports(req: AuthRequest, res: Response): Promise<void> {
  try {
    const orgId = req.organizationId ?? req.user!.organizationId
    const userId = req.user!.userId
    const role = getRole(req)
    const range = parseReportRange(req.query.range)

    const report = await buildOrganizationReport({
      organizationId: orgId,
      userId,
      role,
      range,
    })

    res.json(report)
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
}
