import Redis from 'ioredis'
import { config } from '../config'

let redis: Redis | null = null

export async function connectRedis(): Promise<Redis | null> {
  try {
    redis = new Redis(config.redisUrl, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      retryStrategy: (times) => (times > 3 ? null : Math.min(times * 200, 2000)),
    })
    await redis.connect()
    console.log('Redis connected')
    return redis
  } catch (error) {
    console.warn('Redis unavailable — running without cache:', (error as Error).message)
    redis = null
    return null
  }
}

export function getRedis(): Redis | null {
  return redis
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  if (!redis) return null
  try {
    const data = await redis.get(key)
    return data ? JSON.parse(data) as T : null
  } catch {
    return null
  }
}

export async function cacheSet(key: string, value: unknown, ttlSeconds = 300): Promise<void> {
  if (!redis) return
  try {
    await redis.setex(key, ttlSeconds, JSON.stringify(value))
  } catch {
    // ignore cache errors
  }
}

export async function cacheDel(key: string): Promise<void> {
  if (!redis) return
  try {
    await redis.del(key)
  } catch {
    // ignore
  }
}
