import { readFileSync } from 'fs'

const envFile = readFileSync('/home/je3393/clipai/.env.local', 'utf8')
envFile.split('\n').forEach(line => {
  const [key, ...val] = line.split('=')
  if (key && val.length) process.env[key.trim()] = val.join('=').trim().replace(/^"|"$/g, '')
})

import pg from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

await prisma.$connect()
console.log('✅ PostgreSQL connected!')
const count = await prisma.user.count()
console.log('Users:', count)
await prisma.$disconnect()
