import type { LatestWeekPlanDto, PlannerDataDto, RecipeDto, ShoppingListItemDto } from '../../lib/auth'

export type DayKey =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday'

export type MealKey = 'breakfast' | 'lunch' | 'dinner'

export type Recipe = {
  id: string
  title: string
  sourceUrl: string
  notes: string
  categories: string[]
  ingredients: string[]
}

export type MealSlot = {
  displayText: string
  recipeId: string | null
}

export type DayPlan = Record<MealKey, MealSlot> & {
  sweet: string
}

export type WeekPlan = Record<DayKey, DayPlan>

export type ShoppingItem = {
  id: string
  text: string
  checked: boolean
  sourceRecipeIds: string[]
  manual: boolean
}

export type PlannerState = {
  weekStartDate: string
  recipes: Recipe[]
  weekPlan: WeekPlan
  shoppingList: ShoppingItem[]
  shoppingListMeta: {
    id: string | null
    generatedAt: string | null
    lastGeneratedFrom: string[]
  }
}

export type AppRoute =
  | { name: 'planner' }
  | { name: 'tablet' }
  | { name: 'day'; day: DayKey }

export const STORAGE_KEY = 'alecooks-planner-v1'

export const dayOrder: Array<{ key: DayKey; label: string; accent: string }> = [
  { key: 'monday', label: 'Monday', accent: '#ffdce8' },
  { key: 'tuesday', label: 'Tuesday', accent: '#dff3ff' },
  { key: 'wednesday', label: 'Wednesday', accent: '#eef0ff' },
  { key: 'thursday', label: 'Thursday', accent: '#e7faef' },
  { key: 'friday', label: 'Friday', accent: '#ffeccf' },
  { key: 'saturday', label: 'Saturday', accent: '#f6e8ff' },
  { key: 'sunday', label: 'Sunday', accent: '#ffe3f6' },
]

export const mealOrder: MealKey[] = ['breakfast', 'lunch', 'dinner']

export const starterCategories = [
  'Breakfast',
  'Lunch',
  'Dinner',
  'Dessert',
  'Chicken',
  'Pasta',
  'Holiday',
]

const starterRecipes: Recipe[] = [
  {
    id: 'recipe-sunrise-oats',
    title: 'Sunrise Berry Oats',
    sourceUrl: 'https://example.com/sunrise-berry-oats',
    notes: 'A cozy breakfast bowl with yogurt and honey.',
    categories: ['Breakfast'],
    ingredients: ['Rolled oats', 'Blueberries', 'Greek yogurt', 'Honey'],
  },
  {
    id: 'recipe-lemon-pasta',
    title: 'Creamy Lemon Pasta',
    sourceUrl: 'https://example.com/creamy-lemon-pasta',
    notes: 'Bright weeknight pasta with spinach and parmesan.',
    categories: ['Dinner', 'Pasta'],
    ingredients: ['Spaghetti', 'Lemons', 'Parmesan', 'Spinach', 'Garlic'],
  },
  {
    id: 'recipe-garden-wrap',
    title: 'Garden Crunch Wraps',
    sourceUrl: 'https://example.com/garden-wraps',
    notes: 'Good for easy lunches and leftovers.',
    categories: ['Lunch'],
    ingredients: ['Tortillas', 'Hummus', 'Cucumber', 'Carrots', 'Lettuce'],
  },
]

export function createBlankDayPlan(): DayPlan {
  return {
    breakfast: { displayText: '', recipeId: null },
    lunch: { displayText: '', recipeId: null },
    dinner: { displayText: '', recipeId: null },
    sweet: '',
  }
}

export function createEmptyWeekPlan(): WeekPlan {
  return {
    monday: createBlankDayPlan(),
    tuesday: createBlankDayPlan(),
    wednesday: createBlankDayPlan(),
    thursday: createBlankDayPlan(),
    friday: createBlankDayPlan(),
    saturday: createBlankDayPlan(),
    sunday: createBlankDayPlan(),
  }
}

export function getWeekStartDateIso(baseDate = new Date()) {
  const mondayOffset = (baseDate.getDay() + 6) % 7
  const monday = new Date(baseDate)
  monday.setDate(baseDate.getDate() - mondayOffset)

  return new Date(
    Date.UTC(monday.getFullYear(), monday.getMonth(), monday.getDate(), 12, 0, 0, 0),
  ).toISOString()
}

function createDefaultWeekPlan(): WeekPlan {
  return {
    monday: {
      breakfast: { displayText: 'Berry oats', recipeId: 'recipe-sunrise-oats' },
      lunch: { displayText: 'Garden wraps', recipeId: 'recipe-garden-wrap' },
      dinner: { displayText: 'Creamy lemon pasta', recipeId: 'recipe-lemon-pasta' },
      sweet: 'Strawberries and whipped cream',
    },
    tuesday: createBlankDayPlan(),
    wednesday: createBlankDayPlan(),
    thursday: createBlankDayPlan(),
    friday: createBlankDayPlan(),
    saturday: createBlankDayPlan(),
    sunday: createBlankDayPlan(),
  }
}

export function createInitialState(): PlannerState {
  return {
    weekStartDate: getWeekStartDateIso(),
    recipes: starterRecipes,
    weekPlan: createDefaultWeekPlan(),
    shoppingList: [],
    shoppingListMeta: {
      id: null,
      generatedAt: null,
      lastGeneratedFrom: [],
    },
  }
}

export function createServerPlannerState(): PlannerState {
  return {
    weekStartDate: getWeekStartDateIso(),
    recipes: [],
    weekPlan: createEmptyWeekPlan(),
    shoppingList: [],
    shoppingListMeta: {
      id: null,
      generatedAt: null,
      lastGeneratedFrom: [],
    },
  }
}

export function getInitialState(): PlannerState {
  if (typeof window === 'undefined') {
    return createInitialState()
  }

  const stored = window.localStorage.getItem(STORAGE_KEY)
  if (!stored) {
    return createInitialState()
  }

  try {
    return JSON.parse(stored) as PlannerState
  } catch {
    return createInitialState()
  }
}

export function getTodayKey(): DayKey {
  const dayIndex = new Date().getDay()
  const lookup: DayKey[] = [
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
  ]

  return lookup[dayIndex]
}

export function isDayKey(value: string): value is DayKey {
  return dayOrder.some((day) => day.key === value)
}

export function getRouteFromLocation(): AppRoute {
  if (typeof window === 'undefined') {
    return { name: 'planner' }
  }

  if (window.location.pathname === '/tablet') {
    return { name: 'tablet' }
  }

  const dayMatch = window.location.pathname.match(/^\/day\/([a-z]+)$/)

  if (dayMatch && isDayKey(dayMatch[1])) {
    return { name: 'day', day: dayMatch[1] }
  }

  return { name: 'planner' }
}

export function getPathForRoute(route: AppRoute) {
  if (route.name === 'tablet') {
    return '/tablet'
  }

  if (route.name === 'day') {
    return `/day/${route.day}`
  }

  return '/'
}

export function getAdjacentDay(day: DayKey, direction: -1 | 1): DayKey {
  const currentIndex = dayOrder.findIndex((candidate) => candidate.key === day)
  const nextIndex = (currentIndex + direction + dayOrder.length) % dayOrder.length
  return dayOrder[nextIndex].key
}

export function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

export function normalizeUrl(value: string) {
  if (!value.trim()) return ''
  if (value.startsWith('http://') || value.startsWith('https://')) return value
  return `https://${value}`
}

export function getRecipeById(recipes: Recipe[], recipeId: string | null) {
  if (!recipeId) return null
  return recipes.find((recipe) => recipe.id === recipeId) ?? null
}

export function toRecipe(recipe: RecipeDto): Recipe {
  return {
    id: recipe.id,
    title: recipe.title,
    sourceUrl: recipe.sourceUrl,
    notes: recipe.notes,
    categories: recipe.categories,
    ingredients: recipe.ingredients,
  }
}

export function toShoppingItem(item: ShoppingListItemDto): ShoppingItem {
  return {
    id: item.id,
    text: item.text,
    checked: item.checked,
    manual: item.manual,
    sourceRecipeIds: item.sourceRecipeIds,
  }
}

export function applyWeekPlanDto(baseState: PlannerState, latestWeekPlan: LatestWeekPlanDto): PlannerState {
  if (!latestWeekPlan) {
    return baseState
  }

  const nextWeekPlan = createEmptyWeekPlan()

  latestWeekPlan.mealSlots.forEach((slot) => {
    const dayKey = slot.dayKey as DayKey
    const mealKey = slot.mealKey as MealKey
    nextWeekPlan[dayKey][mealKey] = {
      displayText: slot.displayText,
      recipeId: slot.recipeId,
    }
  })

  latestWeekPlan.sweetSlots.forEach((slot) => {
    const dayKey = slot.dayKey as DayKey
    nextWeekPlan[dayKey].sweet = slot.displayText
  })

  return {
    ...baseState,
    weekStartDate: latestWeekPlan.weekStartDate,
    weekPlan: nextWeekPlan,
    shoppingList: latestWeekPlan.shoppingList?.items.map(toShoppingItem) ?? [],
    shoppingListMeta: {
      id: latestWeekPlan.shoppingList?.id ?? null,
      generatedAt: latestWeekPlan.shoppingList?.generatedAt ?? null,
      lastGeneratedFrom: [
        ...new Set(latestWeekPlan.mealSlots.map((slot) => slot.recipeId).filter(Boolean)),
      ] as string[],
    },
  }
}

export function plannerStateFromBootstrap(plannerData: PlannerDataDto): PlannerState {
  const baseState: PlannerState = {
    ...createServerPlannerState(),
    recipes: plannerData.recipes.map(toRecipe),
  }

  return applyWeekPlanDto(baseState, plannerData.latestWeekPlan)
}
