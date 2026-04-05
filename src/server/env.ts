import 'dotenv/config'

import { z } from 'zod'

const runtimeNodeEnv = process.env.NODE_ENV ?? 'development'
const isRailwayRuntime = Boolean(
  process.env.RAILWAY_ENVIRONMENT_ID ||
    process.env.RAILWAY_ENVIRONMENT_NAME ||
    process.env.RAILWAY_PROJECT_ID,
)
const isLocalLikeEnv =
  !isRailwayRuntime && (runtimeNodeEnv === 'development' || runtimeNodeEnv === 'test')
const derivedRailwayPublicUrl = process.env.RAILWAY_PUBLIC_DOMAIN
  ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
  : undefined

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  BETTER_AUTH_SECRET: z.string().min(32, 'BETTER_AUTH_SECRET must be at least 32 characters'),
  BETTER_AUTH_URL: z.string().url('BETTER_AUTH_URL must be a valid URL'),
  ALECOOKS_OWNER_USERNAME: z.string().min(3, 'ALECOOKS_OWNER_USERNAME is required'),
  ALECOOKS_OWNER_DISPLAY_NAME: z.string().min(1, 'ALECOOKS_OWNER_DISPLAY_NAME is required'),
  ALECOOKS_OWNER_EMAIL: z.email('ALECOOKS_OWNER_EMAIL must be a valid email'),
  ALECOOKS_OWNER_PASSWORD: z
    .string()
    .min(8, 'ALECOOKS_OWNER_PASSWORD must be at least 8 characters'),
})

function getDevDefaults() {
  if (!isLocalLikeEnv) {
    return {
      BETTER_AUTH_URL: process.env.BETTER_AUTH_URL ?? derivedRailwayPublicUrl,
    }
  }

  return {
    PORT: process.env.PORT ?? '3010',
    BETTER_AUTH_SECRET:
      process.env.BETTER_AUTH_SECRET ?? 'dev-only-super-secret-key-change-me-123',
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL ?? 'http://127.0.0.1:3010',
    DATABASE_URL:
      process.env.DATABASE_URL ??
      'postgresql://postgres:postgres@127.0.0.1:5432/alecooks?schema=public',
    ALECOOKS_OWNER_USERNAME: process.env.ALECOOKS_OWNER_USERNAME ?? 'Ale',
    ALECOOKS_OWNER_DISPLAY_NAME: process.env.ALECOOKS_OWNER_DISPLAY_NAME ?? 'Ale',
    ALECOOKS_OWNER_EMAIL: process.env.ALECOOKS_OWNER_EMAIL ?? 'ale@alecooks.local',
    ALECOOKS_OWNER_PASSWORD:
      process.env.ALECOOKS_OWNER_PASSWORD ?? 'change-me-before-railway-deploy',
  }
}

const parsedEnv = envSchema.safeParse({
  NODE_ENV: process.env.NODE_ENV,
  ...getDevDefaults(),
  ...process.env,
})

if (!parsedEnv.success) {
  const issues = parsedEnv.error.issues
    .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
    .join('\n')

  throw new Error(`Invalid server environment:\n${issues}`)
}

export const env = parsedEnv.data
