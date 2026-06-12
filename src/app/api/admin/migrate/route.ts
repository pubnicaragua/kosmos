import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    // Add the column if it doesn't exist
    await prisma.$executeRawUnsafe(`ALTER TABLE "user_departments" ADD COLUMN IF NOT EXISTS "is_receiver" BOOLEAN NOT NULL DEFAULT false;`)
    return NextResponse.json({ success: true, message: 'Columna agregada exitosamente' })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message })
  }
}
