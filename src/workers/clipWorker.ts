import * as dotenv from 'dotenv'
dotenv.config({ override: true })

// Verify env loaded
console.log('DB URL loaded:', !!process.env.DATABASE_URL)

import { Worker, Job } from 'bullmq'
import Redis from 'ioredis'
import { prisma } from '@/lib/prisma'

const connection = new Redis(process.env.REDIS_URL as string, {
  maxRetriesPerRequest: null,
  connectTimeout: 20000, // 20 detik biar koneksi nggak timeout
})

const worker = new Worker('clip-jobs', async (job: Job) => {
  const { projectId, youtubeUrl } = job.data
  console.log(`Processing job ${job.id} for project ${projectId}`)

  // Update status ke PROCESSING
  await prisma.project.update({
    where: { id: projectId },
    data: { status: 'PROCESSING', progress: 10 }
  })

  try {
    // Kirim ke Python backend
    const response = await fetch(`${process.env.PYTHON_BACKEND_URL}/process`, {
      signal: AbortSignal.timeout(600000),
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, youtubeUrl })
    })

    if (!response.ok) throw new Error(`Python backend error: ${response.status}`)

    const result = await response.json()

    // Simpan clips ke database
    for (const clip of result.clips) {
      await prisma.clip.create({
        data: {
          projectId,
          startSec: clip.startSec,
          endSec: clip.endSec,
          viralityScore: clip.viralityScore,
          storageUrl: clip.storageUrl || null,
          transcript: result.transcript,
          tags: clip.tags || []
        }
      })
    }

    // Update status ke DONE
    await prisma.project.update({
      where: { id: projectId },
      data: { status: 'DONE', progress: 100 }
    })

    console.log(`✅ Job ${job.id} selesai — ${result.clips.length} clips`)
    return result

  } catch (err) {
    await prisma.project.update({
      where: { id: projectId },
      data: { status: 'FAILED', errorMessage: String(err) }
    })
    throw err
  }
}, { connection })

worker.on('completed', job => console.log(`Job ${job.id} completed`))
worker.on('failed', (job, err) => console.error(`Job ${job?.id} failed:`, err))

console.log('🚀 ClipAI Worker running...')
