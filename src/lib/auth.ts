import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret'
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret'
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h'
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '30d'

function parseDurationToSeconds(duration: string, fallbackSeconds: number): number {
  const value = duration.trim().toLowerCase()
  const match = value.match(/^(\d+)([smhd])$/)
  if (!match) return fallbackSeconds

  const amount = parseInt(match[1], 10)
  const unit = match[2]

  if (unit === 's') return amount
  if (unit === 'm') return amount * 60
  if (unit === 'h') return amount * 60 * 60
  if (unit === 'd') return amount * 24 * 60 * 60

  return fallbackSeconds
}

export interface TokenPayload {
  userId: string
  email: string
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export function generateAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as any)
}

export function generateRefreshToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN } as any)
}

export function verifyAccessToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload
  } catch {
    return null
  }
}

export function verifyRefreshToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET) as TokenPayload
  } catch {
    return null
  }
}

export function getRefreshTokenExpiry(): Date {
  const refreshSeconds = parseDurationToSeconds(JWT_REFRESH_EXPIRES_IN, 30 * 24 * 60 * 60)
  return new Date(Date.now() + refreshSeconds * 1000)
}

export function getAccessTokenMaxAgeSeconds(): number {
  return parseDurationToSeconds(JWT_EXPIRES_IN, 8 * 60 * 60)
}

export function getRefreshTokenMaxAgeSeconds(): number {
  return parseDurationToSeconds(JWT_REFRESH_EXPIRES_IN, 30 * 24 * 60 * 60)
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload
    return decoded
  } catch (error) {
    return null
  }
}
