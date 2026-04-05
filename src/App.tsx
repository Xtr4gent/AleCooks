import { type ChangeEvent, type FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import './App.css'
import {
  createRecipe,
  generateShoppingList,
  getBootstrap,
  getSession,
  saveShoppingList,
  saveWeekPlan,
  signInUsername,
  signOut,
  type LatestWeekPlanDto,
  type PlannerDataDto,
  type RecipeDto,
  type SessionUser,
  type ShoppingListItemDto,
} from './lib/auth'

type DayKey =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday'

type MealKey = 'breakfast' | 'lunch' | 'dinner'

type Recipe = {
  id: string
  title: string
  sourceUrl: string
  notes: string
  categories: string[]
  ingredients: string[]
}

type MealSlot = {
  displayText: string
  recipeId: string | null
}

type DayPlan = Record<MealKey, MealSlot> & {
  sweet: string
}

type WeekPlan = Record<DayKey, DayPlan>

type ShoppingItem = {
  id: string
  text: string
  checked: boolean
  sourceRecipeIds: string[]
  manual: boolean
}

type PlannerState = {
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

const STORAGE_KEY = 'alecooks-planner-v1'

const dayOrder: Array<{ key: DayKey; label: string; accent: string }> = [
  { key: 'monday', label: 'Monday', accent: '#ffdce8' },
  { key: 'tuesday', label: 'Tuesday', accent: '#dff3ff' },
  { key: 'wednesday', label: 'Wednesday', accent: '#eef0ff' },
  { key: 'thursday', label: 'Thursday', accent: '#e7faef' },
  { key: 'friday', label: 'Friday', accent: '#ffeccf' },
  { key: 'saturday', label: 'Saturday', accent: '#f6e8ff' },
  { key: 'sunday', label: 'Sunday', accent: '#ffe3f6' },
]

const mealOrder: MealKey[] = ['breakfast', 'lunch', 'dinner']
const starterCategories = [
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

function createBlankDayPlan(): DayPlan {
  return {
    breakfast: { displayText: '', recipeId: null },
    lunch: { displayText: '', recipeId: null },
    dinner: { displayText: '', recipeId: null },
    sweet: '',
  }
}

function createEmptyWeekPlan(): WeekPlan {
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

function getWeekStartDateIso(baseDate = new Date()) {
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

function createInitialState(): PlannerState {
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

function createServerPlannerState(): PlannerState {
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

function getInitialState(): PlannerState {
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

function getTodayKey(): DayKey {
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

function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function normalizeUrl(value: string) {
  if (!value.trim()) return ''
  if (value.startsWith('http://') || value.startsWith('https://')) return value
  return `https://${value}`
}

function getRecipeById(recipes: Recipe[], recipeId: string | null) {
  if (!recipeId) return null
  return recipes.find((recipe) => recipe.id === recipeId) ?? null
}

function toRecipe(recipe: RecipeDto): Recipe {
  return {
    id: recipe.id,
    title: recipe.title,
    sourceUrl: recipe.sourceUrl,
    notes: recipe.notes,
    categories: recipe.categories,
    ingredients: recipe.ingredients,
  }
}

function toShoppingItem(item: ShoppingListItemDto): ShoppingItem {
  return {
    id: item.id,
    text: item.text,
    checked: item.checked,
    manual: item.manual,
    sourceRecipeIds: item.sourceRecipeIds,
  }
}

function applyWeekPlanDto(baseState: PlannerState, latestWeekPlan: LatestWeekPlanDto): PlannerState {
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

function plannerStateFromBootstrap(plannerData: PlannerDataDto): PlannerState {
  const baseState: PlannerState = {
    ...createServerPlannerState(),
    recipes: plannerData.recipes.map(toRecipe),
  }

  return applyWeekPlanDto(baseState, plannerData.latestWeekPlan)
}

function App() {
  const [state, setState] = useState<PlannerState>(getInitialState)
  const [authStatus, setAuthStatus] = useState<'loading' | 'signedOut' | 'signedIn'>('loading')
  const [authPending, setAuthPending] = useState(false)
  const [authError, setAuthError] = useState('')
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null)
  const [bootstrapStatus, setBootstrapStatus] = useState<'idle' | 'loading' | 'loaded' | 'error'>(
    'idle',
  )
  const [serverRecipeCount, setServerRecipeCount] = useState(0)
  const [plannerNotice, setPlannerNotice] = useState('')
  const [plannerError, setPlannerError] = useState('')
  const [recipePending, setRecipePending] = useState(false)
  const [weekPlanPending, setWeekPlanPending] = useState(false)
  const [shoppingPending, setShoppingPending] = useState(false)
  const [authForm, setAuthForm] = useState({
    username: 'Ale',
    password: '',
  })
  const [selectedDay, setSelectedDay] = useState<DayKey>(getTodayKey)
  const [recipeSearch, setRecipeSearch] = useState('')
  const [recipeForm, setRecipeForm] = useState({
    title: '',
    sourceUrl: '',
    notes: '',
    ingredients: '',
    categories: ['Dinner'] as string[],
  })
  const [shoppingItemDraft, setShoppingItemDraft] = useState('')
  const [tabletDay, setTabletDay] = useState<DayKey>(getTodayKey)
  const [tabletRecipeId, setTabletRecipeId] = useState<string | null>(null)

  useEffect(() => {
    if (authStatus === 'signedIn') {
      return
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [authStatus, state])

  const categoryOptions = useMemo(() => {
    const dynamic = state.recipes.flatMap((recipe) => recipe.categories)
    return [...new Set([...starterCategories, ...dynamic])].sort((a, b) =>
      a.localeCompare(b),
    )
  }, [state.recipes])

  const selectedPlan = state.weekPlan[selectedDay]
  const tabletPlan = state.weekPlan[tabletDay]

  const selectedRecipes = useMemo(
    () =>
      state.recipes.filter((recipe) => {
        const matchesSearch =
          recipe.title.toLowerCase().includes(recipeSearch.toLowerCase()) ||
          recipe.categories.some((category) =>
            category.toLowerCase().includes(recipeSearch.toLowerCase()),
          )

        return matchesSearch
      }),
    [recipeSearch, state.recipes],
  )

  const todayRecipe = tabletRecipeId
    ? state.recipes.find((recipe) => recipe.id === tabletRecipeId) ?? null
    : null

  const linkedRecipeIds = useMemo(() => {
    const ids = new Set<string>()

    Object.values(state.weekPlan).forEach((dayPlan) => {
      mealOrder.forEach((meal) => {
        const recipeId = dayPlan[meal].recipeId
        if (recipeId) ids.add(recipeId)
      })
    })

    return [...ids]
  }, [state.weekPlan])

  const loadBootstrap = useCallback(async () => {
    setBootstrapStatus('loading')
    setPlannerError('')

    try {
      const bootstrap = await getBootstrap()
      setServerRecipeCount(bootstrap.plannerData.recipes.length)
      setState(plannerStateFromBootstrap(bootstrap.plannerData))
      setBootstrapStatus('loaded')
      setPlannerNotice('Planner synced from your account.')
    } catch (error) {
      setBootstrapStatus('error')
      setPlannerError(error instanceof Error ? error.message : 'Could not load planner data.')
    }
  }, [])

  const initializeSession = useCallback(async () => {
    try {
      const session = await getSession()

      if (!session?.user) {
        setSessionUser(null)
        setAuthStatus('signedOut')
        return
      }

      setSessionUser(session.user)
      setState(createServerPlannerState())
      setAuthStatus('signedIn')
      await loadBootstrap()
    } catch {
      setSessionUser(null)
      setAuthStatus('signedOut')
    }
  }, [loadBootstrap])

  useEffect(() => {
    void initializeSession()
  }, [initializeSession])

  function updateMealSlot(day: DayKey, meal: MealKey, updates: Partial<MealSlot>) {
    setState((current) => ({
      ...current,
      weekPlan: {
        ...current.weekPlan,
        [day]: {
          ...current.weekPlan[day],
          [meal]: {
            ...current.weekPlan[day][meal],
            ...updates,
          },
        },
      },
    }))
    setPlannerNotice('')
    setPlannerError('')
  }

  function handleMealTextChange(day: DayKey, meal: MealKey, value: string) {
    const currentSlot = state.weekPlan[day][meal]
    const linkedRecipe = getRecipeById(state.recipes, currentSlot.recipeId)
    const shouldClearRecipe =
      linkedRecipe !== null && value.trim() !== '' && value.trim() !== linkedRecipe.title

    updateMealSlot(day, meal, {
      displayText: value,
      recipeId: shouldClearRecipe ? null : currentSlot.recipeId,
    })
  }

  function updateSweet(day: DayKey, value: string) {
    setState((current) => ({
      ...current,
      weekPlan: {
        ...current.weekPlan,
        [day]: {
          ...current.weekPlan[day],
          sweet: value,
        },
      },
    }))
    setPlannerNotice('')
    setPlannerError('')
  }

  function handleRecipeLink(day: DayKey, meal: MealKey, recipeId: string) {
    const linkedRecipe = state.recipes.find((recipe) => recipe.id === recipeId)

    updateMealSlot(day, meal, {
      recipeId: recipeId || null,
      displayText: linkedRecipe ? linkedRecipe.title : state.weekPlan[day][meal].displayText,
    })
  }

  function handleRecipeFormChange(field: keyof typeof recipeForm, value: string | string[]) {
    setRecipeForm((current) => ({
      ...current,
      [field]: value,
    }))
  }

  function handleCategoryToggle(category: string) {
    setRecipeForm((current) => {
      const exists = current.categories.includes(category)

      return {
        ...current,
        categories: exists
          ? current.categories.filter((item) => item !== category)
          : [...current.categories, category],
      }
    })
  }

  async function addRecipe() {
    if (!recipeForm.title.trim()) return

    setRecipePending(true)
    setPlannerError('')
    setPlannerNotice('')

    try {
      const response = await createRecipe({
        title: recipeForm.title.trim(),
        sourceUrl: normalizeUrl(recipeForm.sourceUrl.trim()),
        notes: recipeForm.notes.trim(),
        categories: recipeForm.categories.length > 0 ? recipeForm.categories : ['Dinner'],
        ingredients: recipeForm.ingredients
          .split('\n')
          .map((item) => item.trim())
          .filter(Boolean),
      })

      const nextRecipe = toRecipe(response.recipe)
      setState((current) => ({
        ...current,
        recipes: [nextRecipe, ...current.recipes],
      }))
      setServerRecipeCount((count) => count + 1)
      setRecipeForm({
        title: '',
        sourceUrl: '',
        notes: '',
        ingredients: '',
        categories: ['Dinner'],
      })
      setPlannerNotice('Recipe saved to your account.')
    } catch (error) {
      setPlannerError(error instanceof Error ? error.message : 'Could not save recipe.')
    } finally {
      setRecipePending(false)
    }
  }

  async function saveWeekPlanToServer() {
    setWeekPlanPending(true)
    setPlannerError('')
    setPlannerNotice('')

    try {
      const response = await saveWeekPlan({
        weekStartDate: state.weekStartDate,
        days: state.weekPlan,
      })

      setState((current) => applyWeekPlanDto(current, response.weekPlan))
      setPlannerNotice('Week plan saved to your kitchen dashboard.')
    } catch (error) {
      setPlannerError(error instanceof Error ? error.message : 'Could not save week plan.')
    } finally {
      setWeekPlanPending(false)
    }
  }

  async function persistShoppingItems(nextItems: ShoppingItem[], notice: string) {
    setShoppingPending(true)
    setPlannerError('')
    setPlannerNotice('')

    try {
      const response = await saveShoppingList({
        weekStartDate: state.weekStartDate,
        items: nextItems.map((item) => ({
          text: item.text,
          checked: item.checked,
          manual: item.manual,
          sourceRecipeIds: item.sourceRecipeIds,
        })),
      })

      setState((current) => ({
        ...current,
        shoppingList: response.shoppingList?.items.map(toShoppingItem) ?? [],
        shoppingListMeta: {
          ...current.shoppingListMeta,
          id: response.shoppingList?.id ?? null,
          generatedAt: response.shoppingList?.generatedAt ?? null,
        },
      }))
      setPlannerNotice(notice)
    } catch (error) {
      setPlannerError(error instanceof Error ? error.message : 'Could not update shopping list.')
    } finally {
      setShoppingPending(false)
    }
  }

  async function handleGenerateShoppingList() {
    setShoppingPending(true)
    setPlannerError('')
    setPlannerNotice('')

    try {
      const savedWeekPlan = await saveWeekPlan({
        weekStartDate: state.weekStartDate,
        days: state.weekPlan,
      })

      const response = await generateShoppingList({
        weekStartDate: state.weekStartDate,
      })

      setState((current) => ({
        ...applyWeekPlanDto(current, savedWeekPlan.weekPlan),
        shoppingList: response.shoppingList?.items.map(toShoppingItem) ?? [],
        shoppingListMeta: {
          id: response.shoppingList?.id ?? null,
          generatedAt: response.shoppingList?.generatedAt ?? null,
          lastGeneratedFrom: linkedRecipeIds,
        },
      }))
      setPlannerNotice('Shopping list regenerated from your saved week plan.')
    } catch (error) {
      setPlannerError(
        error instanceof Error ? error.message : 'Could not generate shopping list.',
      )
    } finally {
      setShoppingPending(false)
    }
  }

  async function toggleShoppingItem(itemId: string) {
    const nextItems = state.shoppingList.map((item) =>
      item.id === itemId ? { ...item, checked: !item.checked } : item,
    )

    await persistShoppingItems(nextItems, 'Shopping list updated.')
  }

  async function addManualShoppingItem() {
    if (!shoppingItemDraft.trim()) return

    const nextItems = [
      ...state.shoppingList,
      {
        id: `item-${crypto.randomUUID()}`,
        text: shoppingItemDraft.trim(),
        checked: false,
        sourceRecipeIds: [],
        manual: true,
      },
    ]

    setShoppingItemDraft('')
    await persistShoppingItems(nextItems, 'Added a custom grocery item.')
  }

  async function removeShoppingItem(itemId: string) {
    const nextItems = state.shoppingList.filter((item) => item.id !== itemId)
    await persistShoppingItems(nextItems, 'Removed the grocery item.')
  }

  function handleTabletDayChange(event: ChangeEvent<HTMLSelectElement>) {
    const nextDay = event.target.value as DayKey
    setTabletDay(nextDay)
    setTabletRecipeId(null)
  }

  async function handleAuthSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setAuthPending(true)
    setAuthError('')

    try {
      await signInUsername({
        username: authForm.username.trim(),
        password: authForm.password,
      })

      setAuthForm({
        username: 'Ale',
        password: '',
      })

      await initializeSession()
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Could not authenticate.')
    } finally {
      setAuthPending(false)
    }
  }

  async function handleSignOut() {
    await signOut()
    setSessionUser(null)
    setState(getInitialState())
    setAuthStatus('signedOut')
    setBootstrapStatus('idle')
    setServerRecipeCount(0)
    setPlannerNotice('')
    setPlannerError('')
  }

  if (authStatus === 'loading') {
    return (
      <div className="auth-screen">
        <div className="auth-card">
          <p className="eyebrow">AleCooks</p>
          <h1>Setting the table...</h1>
          <p>Checking your session and getting the kitchen ready.</p>
        </div>
      </div>
    )
  }

  if (authStatus === 'signedOut') {
    return (
      <div className="auth-screen">
        <form className="auth-card" onSubmit={handleAuthSubmit}>
          <p className="eyebrow">AleCooks</p>
          <h1>Welcome back to your menu board.</h1>
          <p className="auth-copy">
            AleCooks is now set up as a single-owner kitchen dashboard. Sign in with your
            username and password to get to the planner.
          </p>

          <label className="field">
            <span>Username</span>
            <input
              type="text"
              value={authForm.username}
              onChange={(event) =>
                setAuthForm((current) => ({ ...current, username: event.target.value }))
              }
              placeholder="Ale"
              autoCapitalize="none"
              autoCorrect="off"
            />
          </label>

          <label className="field">
            <span>Password</span>
            <input
              type="password"
              value={authForm.password}
              onChange={(event) =>
                setAuthForm((current) => ({ ...current, password: event.target.value }))
              }
              placeholder="At least one good secret"
            />
          </label>

          {authError ? <p className="auth-error">{authError}</p> : null}

          <button className="primary-button" type="submit" disabled={authPending}>
            {authPending ? 'Working...' : 'Sign in'}
          </button>
        </form>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <div className="app-toolbar">
        <div>
          <p className="section-label">Signed in</p>
          <strong>{sessionUser?.displayUsername ?? sessionUser?.username ?? sessionUser?.name}</strong>
        </div>
        <div className="toolbar-actions">
          <span className="chip">
            {bootstrapStatus === 'loaded'
              ? `${serverRecipeCount} server recipes ready`
              : bootstrapStatus === 'loading'
                ? 'Connecting to server...'
                : bootstrapStatus === 'error'
                  ? 'Server bootstrap needs attention'
                  : 'Bootstrap idle'}
          </span>
          <button className="soft-button" type="button" onClick={handleSignOut}>
            Sign out
          </button>
        </div>
      </div>

      {plannerError ? <p className="planner-banner planner-banner--error">{plannerError}</p> : null}
      {!plannerError && plannerNotice ? (
        <p className="planner-banner planner-banner--notice">{plannerNotice}</p>
      ) : null}

      <header className="hero-panel">
        <div className="hero-copy">
          <p className="eyebrow">AleCooks</p>
          <h1>Your weekly menu, with its own happy little world.</h1>
          <p className="hero-text">
            Plan breakfast, lunch, and dinner without burying meals under a calendar.
            Save recipes, shape the week, and generate a shopping list that stays
            editable.
          </p>
          <div className="hero-pills" aria-label="Core product pillars">
            <span>Planner first</span>
            <span>Recipe friendly</span>
            <span>Tablet ready</span>
          </div>
        </div>
        <aside className="hero-summary" aria-label="This week summary">
          <p className="summary-label">This week</p>
          <ul>
            <li>
              <strong>{state.recipes.length}</strong> saved recipes
            </li>
            <li>
              <strong>
                {
                  mealOrder.filter(
                    (meal) => state.weekPlan[getTodayKey()][meal].displayText.trim() !== '',
                  ).length
                }
              </strong>{' '}
              meals ready today
            </li>
            <li>
              <strong>{state.shoppingList.length}</strong> shopping list items
            </li>
          </ul>
        </aside>
      </header>

      <main className="workspace">
        <section className="planner-panel">
          <div className="panel-heading">
            <div>
              <p className="section-label">Weekly menu planner</p>
              <h2>Give every day its own little card.</h2>
            </div>
            <div className="panel-actions">
              <button
                className="soft-button"
                type="button"
                onClick={() => void saveWeekPlanToServer()}
                disabled={weekPlanPending || bootstrapStatus !== 'loaded'}
              >
                {weekPlanPending ? 'Saving week...' : 'Save week'}
              </button>
              <button
                className="soft-button"
                type="button"
                onClick={() => void handleGenerateShoppingList()}
                disabled={shoppingPending || bootstrapStatus !== 'loaded'}
              >
                {shoppingPending ? 'Generating...' : 'Regenerate shopping list'}
              </button>
            </div>
          </div>

          <div className="planner-grid">
            {dayOrder.map((day) => {
              const dayPlan = state.weekPlan[day.key]
              const isActive = day.key === selectedDay

              return (
                <button
                  key={day.key}
                  type="button"
                  className={`day-card ${isActive ? 'is-active' : ''}`}
                  style={{ ['--card-accent' as string]: day.accent }}
                  onClick={() => setSelectedDay(day.key)}
                >
                  <div className="day-card__header">
                    <span>{day.label}</span>
                    {day.key === getTodayKey() ? <em>Today</em> : null}
                  </div>
                  <div className="meal-preview-list">
                    {mealOrder.map((meal) => (
                      <div key={meal} className="meal-preview">
                        <span className="meal-preview__label">{titleCase(meal)}</span>
                        <strong>{dayPlan[meal].displayText.trim() || 'Add a meal'}</strong>
                      </div>
                    ))}
                  </div>
                </button>
              )
            })}
          </div>
        </section>

        <aside className="editor-panel">
          <div className="panel-heading">
            <div>
              <p className="section-label">Day editor</p>
              <h2>{dayOrder.find((day) => day.key === selectedDay)?.label}</h2>
            </div>
            <span className="chip">Week of {new Date(state.weekStartDate).toLocaleDateString()}</span>
          </div>

          <div className="editor-stack">
            {mealOrder.map((meal) => (
              <section key={meal} className="meal-editor-card">
                <div className="meal-editor-card__header">
                  <h3>{titleCase(meal)}</h3>
                  <span>{selectedPlan[meal].recipeId ? 'Linked recipe' : 'Text only is okay'}</span>
                </div>
                <label className="field">
                  <span>Meal name</span>
                  <input
                    type="text"
                    value={selectedPlan[meal].displayText}
                    placeholder="Leftovers, wraps, lemon pasta..."
                    onChange={(event) =>
                      handleMealTextChange(selectedDay, meal, event.target.value)
                    }
                  />
                </label>
                <label className="field">
                  <span>Link recipe</span>
                  <select
                    value={selectedPlan[meal].recipeId ?? ''}
                    onChange={(event) => handleRecipeLink(selectedDay, meal, event.target.value)}
                  >
                    <option value="">No linked recipe</option>
                    {state.recipes.map((recipe) => (
                      <option key={recipe.id} value={recipe.id}>
                        {recipe.title}
                      </option>
                    ))}
                  </select>
                </label>
              </section>
            ))}

            <section className="meal-editor-card sweet-card">
              <div className="meal-editor-card__header">
                <h3>Something sweet</h3>
                <span>Optional, always welcome</span>
              </div>
              <label className="field">
                <span>Treat or dessert</span>
                <input
                  type="text"
                  value={selectedPlan.sweet}
                  placeholder="Mini lemon cake, berries, cookies..."
                  onChange={(event) => updateSweet(selectedDay, event.target.value)}
                />
              </label>
            </section>
          </div>
        </aside>
      </main>

      <section className="lower-grid">
        <section className="recipe-panel">
          <div className="panel-heading">
            <div>
              <p className="section-label">Recipe library</p>
              <h2>Save the keepers, keep them easy to find.</h2>
            </div>
            <label className="search-field">
              <span className="sr-only">Search recipes</span>
              <input
                type="search"
                value={recipeSearch}
                placeholder="Search by title or category"
                onChange={(event) => setRecipeSearch(event.target.value)}
              />
            </label>
          </div>

          <div className="recipe-panel__content">
            <form
              className="recipe-form"
              onSubmit={(event) => {
                event.preventDefault()
                void addRecipe()
              }}
            >
              <label className="field">
                <span>Recipe title</span>
                <input
                  type="text"
                  value={recipeForm.title}
                  placeholder="Creamy tomato soup"
                  onChange={(event) => handleRecipeFormChange('title', event.target.value)}
                />
              </label>
              <label className="field">
                <span>Source link</span>
                <input
                  type="text"
                  value={recipeForm.sourceUrl}
                  placeholder="example.com/recipe or https://..."
                  onChange={(event) => handleRecipeFormChange('sourceUrl', event.target.value)}
                />
              </label>
              <label className="field">
                <span>Notes</span>
                <textarea
                  rows={3}
                  value={recipeForm.notes}
                  placeholder="Short notes, swaps, why you love it..."
                  onChange={(event) => handleRecipeFormChange('notes', event.target.value)}
                />
              </label>
              <label className="field">
                <span>Ingredients, one per line</span>
                <textarea
                  rows={5}
                  value={recipeForm.ingredients}
                  placeholder={'Garlic\nParmesan\nSpinach'}
                  onChange={(event) => handleRecipeFormChange('ingredients', event.target.value)}
                />
              </label>

              <fieldset className="category-fieldset">
                <legend>Categories</legend>
                <div className="category-chip-list">
                  {categoryOptions.map((category) => (
                    <label key={category} className="category-chip">
                      <input
                        type="checkbox"
                        checked={recipeForm.categories.includes(category)}
                        onChange={() => handleCategoryToggle(category)}
                      />
                      <span>{category}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <button className="primary-button" type="submit" disabled={recipePending}>
                {recipePending ? 'Saving recipe...' : 'Save recipe'}
              </button>
            </form>

            <div className="recipe-list">
              {selectedRecipes.map((recipe) => (
                <article key={recipe.id} className="recipe-card">
                  <div className="recipe-card__header">
                    <div>
                      <h3>{recipe.title}</h3>
                      <p>{recipe.notes || 'Saved for future menu magic.'}</p>
                    </div>
                    {recipe.sourceUrl ? (
                      <a href={recipe.sourceUrl} target="_blank" rel="noreferrer">
                        Visit source
                      </a>
                    ) : null}
                  </div>
                  <div className="tag-list" aria-label={`${recipe.title} categories`}>
                    {recipe.categories.map((category) => (
                      <span key={`${recipe.id}-${category}`} className="tag">
                        {category}
                      </span>
                    ))}
                  </div>
                  <ul className="ingredient-list">
                    {recipe.ingredients.length > 0 ? (
                      recipe.ingredients.map((ingredient) => (
                        <li key={`${recipe.id}-${ingredient}`}>{ingredient}</li>
                      ))
                    ) : (
                      <li>Ingredients can be added later.</li>
                    )}
                  </ul>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="shopping-panel">
          <div className="panel-heading">
            <div>
              <p className="section-label">Shopping list snapshot</p>
              <h2>Generate once, then tweak freely.</h2>
            </div>
            <div className="shopping-meta">
              {state.shoppingListMeta.generatedAt ? (
                <span>
                  Last generated {new Date(state.shoppingListMeta.generatedAt).toLocaleDateString()}
                </span>
              ) : (
                <span>Not generated yet</span>
              )}
            </div>
          </div>

          <div className="shopping-panel__body">
            <div className="shopping-adder">
              <input
                type="text"
                value={shoppingItemDraft}
                placeholder="Add milk, paper towels, berries..."
                onChange={(event) => setShoppingItemDraft(event.target.value)}
              />
              <button
                className="soft-button"
                type="button"
                onClick={() => void addManualShoppingItem()}
                disabled={shoppingPending}
              >
                Add item
              </button>
            </div>

            <ul className="shopping-list">
              {state.shoppingList.length > 0 ? (
                state.shoppingList.map((item) => (
                  <li key={item.id} className={item.checked ? 'is-checked' : ''}>
                    <label>
                      <input
                        type="checkbox"
                        checked={item.checked}
                        onChange={() => void toggleShoppingItem(item.id)}
                        disabled={shoppingPending}
                      />
                      <span>{item.text}</span>
                    </label>
                    <div className="shopping-list__meta">
                      <small>
                        {item.manual
                          ? 'Manual'
                          : `${item.sourceRecipeIds.length} recipe${
                              item.sourceRecipeIds.length > 1 ? 's' : ''
                            }`}
                      </small>
                      <button
                        type="button"
                        onClick={() => void removeShoppingItem(item.id)}
                        disabled={shoppingPending}
                      >
                        Remove
                      </button>
                    </div>
                  </li>
                ))
              ) : (
                <li className="empty-message">
                  Generate from linked recipes, then add your own extras.
                </li>
              )}
            </ul>
          </div>
        </section>
      </section>

      <section className="tablet-panel">
        <div className="panel-heading">
          <div>
            <p className="section-label">Kitchen tablet preview</p>
            <h2>One day, one glance, no clutter.</h2>
          </div>
          <label className="tablet-day-picker">
            <span>Showing</span>
            <select value={tabletDay} onChange={handleTabletDayChange}>
              {dayOrder.map((day) => (
                <option key={day.key} value={day.key}>
                  {day.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="tablet-preview">
          <div className="tablet-screen">
            <div className="tablet-screen__header">
              <p>Today&apos;s menu</p>
              <h3>{dayOrder.find((day) => day.key === tabletDay)?.label}</h3>
            </div>

            <div className="tablet-meals">
              {mealOrder.map((meal) => {
                const linkedRecipe = tabletPlan[meal].recipeId
                  ? state.recipes.find((recipe) => recipe.id === tabletPlan[meal].recipeId) ?? null
                  : null

                return (
                  <button
                    key={meal}
                    type="button"
                    className="tablet-meal-card"
                    onClick={() => setTabletRecipeId(linkedRecipe?.id ?? null)}
                  >
                    <span>{titleCase(meal)}</span>
                    <strong>{tabletPlan[meal].displayText || 'Nothing planned yet'}</strong>
                    <small>{linkedRecipe ? 'Tap for recipe details' : 'Simple meal note'}</small>
                  </button>
                )
              })}
            </div>

            <div className="tablet-detail">
              {todayRecipe ? (
                <>
                  <p className="tablet-detail__eyebrow">Recipe details</p>
                  <h4>{todayRecipe.title}</h4>
                  <ul>
                    {todayRecipe.ingredients.map((ingredient) => (
                      <li key={`${todayRecipe.id}-${ingredient}`}>{ingredient}</li>
                    ))}
                  </ul>
                </>
              ) : (
                <>
                  <p className="tablet-detail__eyebrow">Recipe details</p>
                  <h4>Tap a linked meal to peek at ingredients.</h4>
                  <p>
                    The tablet stays focused on today&apos;s meals first, and opens recipe
                    details only when you want them.
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default App
