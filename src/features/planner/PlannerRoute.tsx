import type { FormEvent } from 'react'
import { dayOrder, getTodayKey, mealOrder, titleCase, type DayKey, type PlannerState } from './planner-state'

type RecipeFormState = {
  title: string
  sourceUrl: string
  notes: string
  ingredients: string
  categories: string[]
}

type PlannerRouteProps = {
  bootstrapStatus: 'idle' | 'loading' | 'loaded' | 'error'
  plannerError: string
  plannerNotice: string
  recipePending: boolean
  weekPlanPending: boolean
  shoppingPending: boolean
  serverRecipeCount: number
  sessionDisplayName: string
  state: PlannerState
  selectedDay: DayKey
  recipeSearch: string
  recipeForm: RecipeFormState
  shoppingItemDraft: string
  categoryOptions: string[]
  selectedRecipeResults: PlannerState['recipes']
  onSignOut: () => void | Promise<void>
  onOpenTabletMode: () => void
  onSelectDay: (day: DayKey) => void
  onMealTextChange: (day: DayKey, meal: 'breakfast' | 'lunch' | 'dinner', value: string) => void
  onRecipeLink: (day: DayKey, meal: 'breakfast' | 'lunch' | 'dinner', recipeId: string) => void
  onSweetChange: (day: DayKey, value: string) => void
  onSaveWeekPlan: () => void | Promise<void>
  onGenerateShoppingList: () => void | Promise<void>
  onRecipeSearchChange: (value: string) => void
  onRecipeFormChange: (field: keyof RecipeFormState, value: string | string[]) => void
  onCategoryToggle: (category: string) => void
  onAddRecipe: () => void | Promise<void>
  onShoppingItemDraftChange: (value: string) => void
  onAddManualShoppingItem: () => void | Promise<void>
  onToggleShoppingItem: (itemId: string) => void | Promise<void>
  onRemoveShoppingItem: (itemId: string) => void | Promise<void>
}

export function PlannerRoute({
  bootstrapStatus,
  plannerError,
  plannerNotice,
  recipePending,
  weekPlanPending,
  shoppingPending,
  serverRecipeCount,
  sessionDisplayName,
  state,
  selectedDay,
  recipeSearch,
  recipeForm,
  shoppingItemDraft,
  categoryOptions,
  selectedRecipeResults,
  onSignOut,
  onOpenTabletMode,
  onSelectDay,
  onMealTextChange,
  onRecipeLink,
  onSweetChange,
  onSaveWeekPlan,
  onGenerateShoppingList,
  onRecipeSearchChange,
  onRecipeFormChange,
  onCategoryToggle,
  onAddRecipe,
  onShoppingItemDraftChange,
  onAddManualShoppingItem,
  onToggleShoppingItem,
  onRemoveShoppingItem,
}: PlannerRouteProps) {
  const selectedPlan = state.weekPlan[selectedDay]

  return (
    <div className="app-shell">
      <div className="app-toolbar">
        <div>
          <p className="section-label">Signed in</p>
          <strong>{sessionDisplayName}</strong>
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
          <button className="soft-button" type="button" onClick={onSignOut}>
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
          <div className="hero-actions">
            <button className="soft-button" type="button" onClick={onOpenTabletMode}>
              Open Tablet Mode
            </button>
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
                onClick={() => void onSaveWeekPlan()}
                disabled={weekPlanPending || bootstrapStatus !== 'loaded'}
              >
                {weekPlanPending ? 'Saving week...' : 'Save week'}
              </button>
              <button
                className="soft-button"
                type="button"
                onClick={() => void onGenerateShoppingList()}
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
                  onClick={() => onSelectDay(day.key)}
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
                    onChange={(event) => onMealTextChange(selectedDay, meal, event.target.value)}
                  />
                </label>
                <label className="field">
                  <span>Link recipe</span>
                  <select
                    value={selectedPlan[meal].recipeId ?? ''}
                    onChange={(event) => onRecipeLink(selectedDay, meal, event.target.value)}
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
                  onChange={(event) => onSweetChange(selectedDay, event.target.value)}
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
                onChange={(event) => onRecipeSearchChange(event.target.value)}
              />
            </label>
          </div>

          <div className="recipe-panel__content">
            <form
              className="recipe-form"
              onSubmit={(event: FormEvent<HTMLFormElement>) => {
                event.preventDefault()
                void onAddRecipe()
              }}
            >
              <label className="field">
                <span>Recipe title</span>
                <input
                  type="text"
                  value={recipeForm.title}
                  placeholder="Creamy tomato soup"
                  onChange={(event) => onRecipeFormChange('title', event.target.value)}
                />
              </label>
              <label className="field">
                <span>Source link</span>
                <input
                  type="text"
                  value={recipeForm.sourceUrl}
                  placeholder="example.com/recipe or https://..."
                  onChange={(event) => onRecipeFormChange('sourceUrl', event.target.value)}
                />
              </label>
              <label className="field">
                <span>Notes</span>
                <textarea
                  rows={3}
                  value={recipeForm.notes}
                  placeholder="Short notes, swaps, why you love it..."
                  onChange={(event) => onRecipeFormChange('notes', event.target.value)}
                />
              </label>
              <label className="field">
                <span>Ingredients, one per line</span>
                <textarea
                  rows={5}
                  value={recipeForm.ingredients}
                  placeholder={'Garlic\nParmesan\nSpinach'}
                  onChange={(event) => onRecipeFormChange('ingredients', event.target.value)}
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
                        onChange={() => onCategoryToggle(category)}
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
              {selectedRecipeResults.map((recipe) => (
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
                onChange={(event) => onShoppingItemDraftChange(event.target.value)}
              />
              <button
                className="soft-button"
                type="button"
                onClick={() => void onAddManualShoppingItem()}
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
                        onChange={() => void onToggleShoppingItem(item.id)}
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
                        onClick={() => void onRemoveShoppingItem(item.id)}
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
    </div>
  )
}
