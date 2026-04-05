import path from 'node:path'
import { fileURLToPath } from 'node:url'

import express, { type NextFunction, type Request, type Response } from 'express'
import { toNodeHandler } from 'better-auth/node'
import { ZodError } from 'zod'

import { auth } from './auth.js'
import { ensureDevDatabaseReady } from './dev-database.js'
import { env } from './env.js'
import { toHeaders } from './http.js'
import { ensureOwnerAccount, isOwnerEmail } from './owner-account.js'
import {
  createRecipeForUser,
  createRecipeSchema,
  generateShoppingListForUser,
  generateShoppingListSchema,
  getPlannerBootstrap,
  saveShoppingListForUser,
  saveShoppingListSchema,
  saveWeekPlanForUser,
  saveWeekPlanSchema,
} from './planner-service.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const clientDistDir = path.resolve(__dirname, '..', '..', 'dist')

const app = express()

async function requireSession(request: Request, response: Response) {
  const session = await auth.api.getSession({
    headers: toHeaders(request.headers),
  })

  if (!session?.user) {
    response.status(401).json({
      error: 'UNAUTHORIZED',
    })
    return null
  }

  if (!isOwnerEmail(session.user.email)) {
    response.status(403).json({
      error: 'OWNER_ONLY',
    })
    return null
  }

  return session
}

function respondValidationError(response: Response, error: ZodError) {
  response.status(400).json({
    error: 'VALIDATION_ERROR',
    issues: error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    })),
  })
}

app.get('/api/health', (_request: Request, response: Response) => {
  response.json({
    ok: true,
    service: 'alecooks',
    mode: env.NODE_ENV,
  })
})

const authHandler = toNodeHandler(auth)

app.use((request: Request, response: Response, next: NextFunction) => {
  if (!request.path.startsWith('/api/auth/')) {
    next()
    return
  }

  authHandler(request, response)
})

app.use(express.json({ limit: '1mb' }))

app.get('/api/bootstrap', async (request: Request, response: Response) => {
  const session = await requireSession(request, response)
  if (!session) {
    return
  }

  const plannerData = await getPlannerBootstrap(session.user.id)

  response.json({
    session: session.session,
    user: session.user,
    plannerData,
  })
})

app.post('/api/recipes', async (request: Request, response: Response) => {
  const session = await requireSession(request, response)
  if (!session) {
    return
  }

  const parsed = createRecipeSchema.safeParse(request.body)
  if (!parsed.success) {
    respondValidationError(response, parsed.error)
    return
  }

  const recipe = await createRecipeForUser(session.user.id, parsed.data)
  response.status(201).json({ recipe })
})

app.put('/api/week-plan', async (request: Request, response: Response) => {
  const session = await requireSession(request, response)
  if (!session) {
    return
  }

  const parsed = saveWeekPlanSchema.safeParse(request.body)
  if (!parsed.success) {
    respondValidationError(response, parsed.error)
    return
  }

  const weekPlan = await saveWeekPlanForUser(session.user.id, parsed.data)
  response.json({ weekPlan })
})

app.post('/api/shopping-list/generate', async (request: Request, response: Response) => {
  const session = await requireSession(request, response)
  if (!session) {
    return
  }

  const parsed = generateShoppingListSchema.safeParse(request.body)
  if (!parsed.success) {
    respondValidationError(response, parsed.error)
    return
  }

  try {
    const shoppingList = await generateShoppingListForUser(session.user.id, parsed.data)
    response.json({ shoppingList })
  } catch (error) {
    response.status(404).json({
      error: error instanceof Error ? error.message : 'SHOPPING_LIST_GENERATION_FAILED',
    })
  }
})

app.put('/api/shopping-list', async (request: Request, response: Response) => {
  const session = await requireSession(request, response)
  if (!session) {
    return
  }

  const parsed = saveShoppingListSchema.safeParse(request.body)
  if (!parsed.success) {
    respondValidationError(response, parsed.error)
    return
  }

  try {
    const shoppingList = await saveShoppingListForUser(session.user.id, parsed.data)
    response.json({ shoppingList })
  } catch (error) {
    response.status(404).json({
      error: error instanceof Error ? error.message : 'SHOPPING_LIST_SAVE_FAILED',
    })
  }
})

if (env.NODE_ENV === 'production') {
  app.use(express.static(clientDistDir))

  app.get('/{*any}', (request: Request, response: Response, next: NextFunction) => {
    if (request.path.startsWith('/api/')) {
      next()
      return
    }

    response.sendFile(path.join(clientDistDir, 'index.html'))
  })
}

await ensureDevDatabaseReady()
await ensureOwnerAccount()

app.listen(env.PORT, () => {
  console.log(`AleCooks server listening on ${env.BETTER_AUTH_URL}`)
})
