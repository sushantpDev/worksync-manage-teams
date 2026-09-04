import path from 'path'
import dotenv from 'dotenv'
import { createServer } from 'http'

dotenv.config({ path: path.resolve(__dirname, '../.env') })

import cors from 'cors'
import express from 'express'
import { config } from './config'
import { connectDatabase } from './config/database'
import { connectRedis } from './config/redis'
import authRoutes from './routes/authRoutes'
import dashboardRoutes from './routes/dashboardRoutes'
import organizationRoutes from './routes/organizationRoutes'
import projectRoutes from './routes/projectRoutes'
import taskRoutes from './routes/taskRoutes'
import commentRoutes from './routes/commentRoutes'
import activityRoutes from './routes/activityRoutes'
import notificationRoutes from './routes/notificationRoutes'
import invitationRoutes from './routes/invitationRoutes'
import searchRoutes from './routes/searchRoutes'
import reportsRoutes from './routes/reportsRoutes'
import communicationRoutes from './routes/communicationRoutes'
import { configureTrustProxy } from './middleware/trustProxy'
import { initSocketServer } from './socket/socketServer'
import { verifyEmailService } from './services/emailService'

const app = express()

configureTrustProxy(app)

app.use(cors({ origin: config.clientUrl, credentials: true }))
app.use(express.json())

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.use('/api/auth', authRoutes)
app.use('/api/organizations', organizationRoutes)
app.use('/api/projects', projectRoutes)
app.use('/api/tasks', taskRoutes)
app.use('/api/comments', commentRoutes)
app.use('/api/activities', activityRoutes)
app.use('/api/notifications', notificationRoutes)
app.use('/api/invitations', invitationRoutes)
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/search', searchRoutes)
app.use('/api/reports', reportsRoutes)
app.use('/api/communication', communicationRoutes)

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' })
})

async function start() {
  await connectDatabase()
  await connectRedis()
  await verifyEmailService()

  const httpServer = createServer(app)
  initSocketServer(httpServer)

  httpServer.listen(config.port, () => {
    console.log(`Server running on http://localhost:${config.port}`)
  })

  httpServer.on('error', (error: NodeJS.ErrnoException) => {
    if (error.code === 'EADDRINUSE') {
      console.error(
        `Port ${config.port} is already in use. Stop other WorkSync server instances and restart.`
      )
      process.exit(1)
    }
    throw error
  })
}

start().catch(console.error)
