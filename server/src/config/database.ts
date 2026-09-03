import dns from 'node:dns'
import mongoose from 'mongoose'
import { config } from './index'

function ensureResolvableDns() {
  const servers = dns.getServers()
  const onlyLoopback =
    servers.length > 0 && servers.every((server) => server === '127.0.0.1' || server === '::1')

  // Some Windows setups point Node at a local resolver that refuses SRV lookups
  // (breaks mongodb+srv://). Fall back to public DNS in that case.
  if (onlyLoopback) {
    dns.setServers(['8.8.8.8', '1.1.1.1', '192.168.0.1'])
  }
}

export async function connectDatabase(): Promise<void> {
  try {
    ensureResolvableDns()
    await mongoose.connect(config.mongoUri)
    console.log(`MongoDB connected (${mongoose.connection.name})`)
  } catch (error) {
    console.error('MongoDB connection failed:', (error as Error).message)
    throw error
  }
}
