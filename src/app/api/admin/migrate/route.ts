import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  const results: string[] = []
  const errors: string[] = []

  const migrations = [
    `ALTER TABLE "user_departments" ADD COLUMN IF NOT EXISTS "is_receiver" BOOLEAN NOT NULL DEFAULT false`,
    `ALTER TABLE "user_departments" ADD COLUMN IF NOT EXISTS "is_buyer" BOOLEAN NOT NULL DEFAULT false`,
    `ALTER TABLE "user_departments" ADD COLUMN IF NOT EXISTS "is_approver" BOOLEAN NOT NULL DEFAULT false`,
  ]

  for (const sql of migrations) {
    try {
      await prisma.$executeRawUnsafe(sql)
      results.push(`OK: ${sql.substring(0, 60)}...`)
    } catch (error: any) {
      errors.push(`ERR: ${error.message}`)
    }
  }

  return NextResponse.json({ success: errors.length === 0, results, errors })
}
