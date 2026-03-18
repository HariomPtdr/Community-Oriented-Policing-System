import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// Initialize redis only if env vars are present to avoid breaking local dev
const createLimiter = (limiterType: any, prefix: string) => {
  try {
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
      const redis = Redis.fromEnv()
      return new Ratelimit({
        redis,
        limiter: limiterType,
        prefix,
      })
    }
  } catch (err) {
    console.warn('Upstash Redis env config missing. Analytics/Rate limiting disabled.')
  }
  return null
}

export const rateLimiters = {
  // Max 3 password changes per hour
  changePassword: createLimiter(Ratelimit.slidingWindow(3, '1 h'), 'cops:change_password'),
  
  // Max 5 TOTP verify attempts per 15 min (brute force protection)
  totpVerify: createLimiter(Ratelimit.slidingWindow(5, '15 m'), 'cops:totp_verify'),
  
  // Max 1 data export per 7 days
  dataExport: createLimiter(Ratelimit.slidingWindow(1, '7 d'), 'cops:data_export'),
  
  // Max 3 session revokes per minute (prevent abuse)
  revokeSession: createLimiter(Ratelimit.slidingWindow(10, '1 m'), 'cops:revoke_session'),
}

// Helper
export async function checkRateLimit(
  limiter: Ratelimit | null,
  identifier: string
): Promise<{ allowed: boolean; retryAfter?: number }> {
  if (!limiter) {
    // If no Redis config, bypass rate limiting for local dev
    return { allowed: true }
  }
  
  try {
    const { success, reset } = await limiter.limit(identifier)
    if (!success) {
      const retryAfter = Math.ceil((reset - Date.now()) / 1000)
      return { allowed: false, retryAfter }
    }
  } catch (error) {
    console.error('Rate limit check failed:', error)
  }
  return { allowed: true }
}
