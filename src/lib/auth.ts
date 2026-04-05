export type SessionUser = {
  id: string
  email: string
  name: string
  username?: string
  displayUsername?: string
  emailVerified: boolean
}

export type RecipeDto = {
  id: string
  title: string
  sourceUrl: string
  notes: string
  categories: string[]
  ingredients: string[]
}

export type ShoppingListItemDto = {
  id: string
  text: string
  checked: boolean
  manual: boolean
  sourceRecipeIds: string[]
}

export type LatestWeekPlanDto = {
  id: string
  weekStartDate: string
  mealSlots: Array<{
    id: string
    dayKey: string
    mealKey: string
    displayText: string
    recipeId: string | null
  }>
  sweetSlots: Array<{
    id: string
    dayKey: string
    displayText: string
  }>
  shoppingList: {
    id: string
    generatedAt: string
    items: ShoppingListItemDto[]
  } | null
} | null

export type PlannerDataDto = {
  recipes: RecipeDto[]
  latestWeekPlan: LatestWeekPlanDto
}

export type AuthSessionResponse = {
  session: {
    id: string
    userId: string
    expiresAt: string
  }
  user: SessionUser
} | null

export type BootstrapResponse = {
  session: {
    id: string
    userId: string
    expiresAt: string
  }
  user: SessionUser
  plannerData: PlannerDataDto
}

async function request<T>(path: string, init?: RequestInit) {
  const response = await fetch(path, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    ...init,
  })

  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || `Request failed: ${response.status}`)
  }

  return (await response.json()) as T
}

export function getSession() {
  return request<AuthSessionResponse>('/api/auth/get-session')
}

export function signInUsername(input: { username: string; password: string }) {
  return request('/api/auth/sign-in/username', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function signOut() {
  return request('/api/auth/sign-out', {
    method: 'POST',
  })
}

export function getBootstrap() {
  return request<BootstrapResponse>('/api/bootstrap')
}

export function createRecipe(input: {
  title: string
  sourceUrl: string
  notes: string
  categories: string[]
  ingredients: string[]
}) {
  return request<{ recipe: RecipeDto }>('/api/recipes', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function saveWeekPlan(input: {
  weekStartDate: string
  days: Record<
    string,
    {
      breakfast: { displayText: string; recipeId: string | null }
      lunch: { displayText: string; recipeId: string | null }
      dinner: { displayText: string; recipeId: string | null }
      sweet: string
    }
  >
}) {
  return request<{ weekPlan: LatestWeekPlanDto }>('/api/week-plan', {
    method: 'PUT',
    body: JSON.stringify(input),
  })
}

export function generateShoppingList(input: { weekStartDate: string }) {
  return request<{ shoppingList: NonNullable<LatestWeekPlanDto>['shoppingList'] }>(
    '/api/shopping-list/generate',
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  )
}

export function saveShoppingList(input: {
  weekStartDate: string
  items: Array<{
    text: string
    checked: boolean
    manual: boolean
    sourceRecipeIds: string[]
  }>
}) {
  return request<{ shoppingList: NonNullable<LatestWeekPlanDto>['shoppingList'] }>(
    '/api/shopping-list',
    {
      method: 'PUT',
      body: JSON.stringify(input),
    },
  )
}
