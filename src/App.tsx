import { type ChangeEvent, type FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import './App.css'
import { AuthLoadingScreen, AuthScreen } from './features/auth/AuthScreen'
import { PlannerRoute } from './features/planner/PlannerRoute'
import {
  STORAGE_KEY,
  applyWeekPlanDto,
  createServerPlannerState,
  getAdjacentDay,
  getInitialState,
  getRecipeById,
  getRouteFromLocation,
  getTodayKey,
  mealOrder,
  normalizeUrl,
  plannerStateFromBootstrap,
  starterCategories,
  toRecipe,
  toShoppingItem,
  type AppRoute,
  type DayKey,
  type MealKey,
  type MealSlot,
  type PlannerState,
  type ShoppingItem,
} from './features/planner/planner-state'
import { TabletRoute } from './features/tablet/TabletRoute'
import {
  createRecipe,
  generateShoppingList,
  getBootstrap,
  getSession,
  saveShoppingList,
  saveWeekPlan,
  signInUsername,
  signOut,
  type SessionUser,
} from './lib/auth'

function App() {
  const [state, setState] = useState<PlannerState>(getInitialState)
  const [route, setRoute] = useState<AppRoute>(getRouteFromLocation)
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

  const sessionDisplayName =
    sessionUser?.displayUsername ?? sessionUser?.username ?? sessionUser?.name ?? 'Ale'

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

  useEffect(() => {
    const handlePopState = () => {
      setRoute(getRouteFromLocation())
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

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

  function navigateToRoute(nextRoute: AppRoute) {
    const nextPath = nextRoute === 'tablet' ? '/tablet' : '/'
    window.history.pushState({}, '', nextPath)
    setRoute(nextRoute)
  }

  function handleOpenTabletMode() {
    setTabletDay(getTodayKey())
    setTabletRecipeId(null)
    navigateToRoute('tablet')
  }

  function handleReturnToPlanner() {
    navigateToRoute('planner')
  }

  function handleTabletStep(direction: -1 | 1) {
    setTabletDay((current) => getAdjacentDay(current, direction))
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
      <AuthLoadingScreen
        title="Setting the table..."
        message="Checking your session and getting the kitchen ready."
      />
    )
  }

  if (authStatus === 'signedOut') {
    return (
      <AuthScreen
        authForm={authForm}
        authError={authError}
        authPending={authPending}
        onSubmit={handleAuthSubmit}
        onUsernameChange={(value) =>
          setAuthForm((current) => ({ ...current, username: value }))
        }
        onPasswordChange={(value) =>
          setAuthForm((current) => ({ ...current, password: value }))
        }
      />
    )
  }

  if (route === 'tablet') {
    return (
      <TabletRoute
        plannerError={plannerError}
        plannerNotice={plannerNotice}
        sessionDisplayName={sessionDisplayName}
        state={state}
        tabletDay={tabletDay}
        todayRecipe={todayRecipe}
        onReturnToPlanner={handleReturnToPlanner}
        onSignOut={handleSignOut}
        onTabletStep={handleTabletStep}
        onTabletDayChange={handleTabletDayChange}
        onSelectTabletRecipe={setTabletRecipeId}
      />
    )
  }

  return (
    <PlannerRoute
      bootstrapStatus={bootstrapStatus}
      plannerError={plannerError}
      plannerNotice={plannerNotice}
      recipePending={recipePending}
      weekPlanPending={weekPlanPending}
      shoppingPending={shoppingPending}
      serverRecipeCount={serverRecipeCount}
      sessionDisplayName={sessionDisplayName}
      state={state}
      selectedDay={selectedDay}
      recipeSearch={recipeSearch}
      recipeForm={recipeForm}
      shoppingItemDraft={shoppingItemDraft}
      categoryOptions={categoryOptions}
      selectedRecipeResults={selectedRecipes}
      onSignOut={handleSignOut}
      onOpenTabletMode={handleOpenTabletMode}
      onSelectDay={setSelectedDay}
      onMealTextChange={handleMealTextChange}
      onRecipeLink={handleRecipeLink}
      onSweetChange={updateSweet}
      onSaveWeekPlan={saveWeekPlanToServer}
      onGenerateShoppingList={handleGenerateShoppingList}
      onRecipeSearchChange={setRecipeSearch}
      onRecipeFormChange={handleRecipeFormChange}
      onCategoryToggle={handleCategoryToggle}
      onAddRecipe={addRecipe}
      onShoppingItemDraftChange={setShoppingItemDraft}
      onAddManualShoppingItem={addManualShoppingItem}
      onToggleShoppingItem={toggleShoppingItem}
      onRemoveShoppingItem={removeShoppingItem}
    />
  )
}

export default App
