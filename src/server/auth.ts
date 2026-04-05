import { prismaAdapter } from 'better-auth/adapters/prisma'
import { betterAuth } from 'better-auth'
import { username } from 'better-auth/plugins'

import { prisma } from './db.js'
import { env } from './env.js'

export const auth = betterAuth({
  basePath: '/auth',
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    disableSignUp: true,
  },
  plugins: [username()],
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
  },
  advanced: {
    crossSubDomainCookies: {
      enabled: false,
    },
  },
  trustedOrigins: [env.BETTER_AUTH_URL],
  user: {
    deleteUser: {
      enabled: false,
    },
  },
})
