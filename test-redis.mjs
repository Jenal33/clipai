import Redis from 'ioredis'
import { Queue } from 'bullmq'

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379')

async function main() {
  const pong = await redis.ping()
  console.log('Redis:', pong)
  const q = new Queue('clip-jobs', { connection: redis })
  const job = await q.add('test', { url: 'https://youtube.com/test' })
  console.log('✅ BullMQ job added:', job.id)
  await redis.quit()
}
main().catch(console.error)
