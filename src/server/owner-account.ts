import { hashPassword } from 'better-auth/crypto'

import { auth } from './auth.js'
import { prisma } from './db.js'
import { env } from './env.js'

function normalizeUsername(value: string) {
  return value.trim().toLowerCase()
}

export async function ensureOwnerAccount() {
  const ownerEmail = env.ALECOOKS_OWNER_EMAIL.toLowerCase()
  const ownerUsername = normalizeUsername(env.ALECOOKS_OWNER_USERNAME)
  const authContext = await auth.$context

  const existingOwner = await prisma.user.findUnique({
    where: { email: ownerEmail },
    include: {
      accounts: true,
    },
  })

  if (!existingOwner) {
    const passwordHash = await hashPassword(env.ALECOOKS_OWNER_PASSWORD)
    const createdUser = await authContext.internalAdapter.createUser({
      email: ownerEmail,
      name: env.ALECOOKS_OWNER_DISPLAY_NAME,
      username: ownerUsername,
      displayUsername: env.ALECOOKS_OWNER_USERNAME,
      emailVerified: false,
    } as never)

    await authContext.internalAdapter.linkAccount({
      userId: createdUser.id,
      providerId: 'credential',
      accountId: createdUser.id,
      password: passwordHash,
    })
    return
  }

  const credentialAccount = existingOwner.accounts.find(
    (account) => account.providerId === 'credential',
  )

  const updates: {
    name?: string
    username?: string
    displayUsername?: string
  } = {}

  if (existingOwner.name !== env.ALECOOKS_OWNER_DISPLAY_NAME) {
    updates.name = env.ALECOOKS_OWNER_DISPLAY_NAME
  }

  if (existingOwner.username !== ownerUsername) {
    updates.username = ownerUsername
  }

  if (existingOwner.displayUsername !== env.ALECOOKS_OWNER_USERNAME) {
    updates.displayUsername = env.ALECOOKS_OWNER_USERNAME
  }

  if (Object.keys(updates).length > 0) {
    await prisma.user.update({
      where: { id: existingOwner.id },
      data: updates,
    })
  }

  if (!credentialAccount) {
    const passwordHash = await hashPassword(env.ALECOOKS_OWNER_PASSWORD)
    await authContext.internalAdapter.linkAccount({
      userId: existingOwner.id,
      providerId: 'credential',
      accountId: existingOwner.id,
      password: passwordHash,
    })
    return
  }

  const passwordHash = await hashPassword(env.ALECOOKS_OWNER_PASSWORD)
  await prisma.account.update({
    where: { id: credentialAccount.id },
    data: {
      password: passwordHash,
    },
  })
}

export function isOwnerEmail(email: string) {
  return email.toLowerCase() === env.ALECOOKS_OWNER_EMAIL.toLowerCase()
}
