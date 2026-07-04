import Redis from 'ioredis'

// Singleton Redis client
const globalForRedis = globalThis as unknown as { redis: Redis | undefined }

export const redis = globalForRedis.redis ?? new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null, // Diperlukan oleh BullMQ
  enableReadyCheck: false,
  lazyConnect: true,
})

if (process.env.NODE_ENV !== 'production') globalForRedis.redis = redis

// Koneksi Redis khusus BullMQ (membutuhkan koneksi terpisah)
export function createBullMQConnection() {
  const url = new URL(process.env.REDIS_URL || 'redis://localhost:6379')
  return {
    host: url.hostname,
    port: Number(url.port) || 6379,
    db: url.pathname ? Number(url.pathname.slice(1)) : 0,
    ...(url.password ? { password: url.password } : {}),
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  }
}
