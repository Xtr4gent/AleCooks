import { dayOrder, mealOrder, titleCase, type DayKey, type PlannerState } from './planner-state'

type DayEditorRouteProps = {
  bootstrapStatus: 'idle' | 'loading' | 'loaded' | 'error'
  plannerError: string
  plannerNotice: string
  weekPlanPending: boolean
  sessionDisplayName: string
  state: PlannerState
  day: DayKey
  onSignOut: () => void | Promise<void>
  onBackToWeek: () => void
  onOpenTabletMode: () => void
  onPreviousDay: () => void
  onNextDay: () => void
  onMealTextChange: (day: DayKey, meal: 'breakfast' | 'lunch' | 'dinner', value: string) => void
  onRecipeLink: (day: DayKey, meal: 'breakfast' | 'lunch' | 'dinner', recipeId: string) => void
  onSweetChange: (day: DayKey, value: string) => void
  onSaveWeekPlan: () => void | Promise<void>
}

export function DayEditorRoute({
  bootstrapStatus,
  plannerError,
  plannerNotice,
  weekPlanPending,
  sessionDisplayName,
  state,
  day,
  onSignOut,
  onBackToWeek,
  onOpenTabletMode,
  onPreviousDay,
  onNextDay,
  onMealTextChange,
  onRecipeLink,
  onSweetChange,
  onSaveWeekPlan,
}: DayEditorRouteProps) {
  const selectedPlan = state.weekPlan[day]
  const dayLabel = dayOrder.find((item) => item.key === day)?.label ?? titleCase(day)

  return (
    <div className="app-shell">
      <div className="app-toolbar">
        <div>
          <p className="section-label">Day editor</p>
          <strong>{sessionDisplayName}</strong>
        </div>
        <div className="toolbar-actions">
          <button className="soft-button" type="button" onClick={onOpenTabletMode}>
            Open Tablet Mode
          </button>
          <button className="soft-button" type="button" onClick={onSignOut}>
            Sign out
          </button>
        </div>
      </div>

      {plannerError ? <p className="planner-banner planner-banner--error">{plannerError}</p> : null}
      {!plannerError && plannerNotice ? (
        <p className="planner-banner planner-banner--notice">{plannerNotice}</p>
      ) : null}

      <section className="planner-panel">
        <div className="panel-heading">
          <div>
            <p className="section-label">Daily menu editor</p>
            <h1>{dayLabel}</h1>
            <p className="hero-text">
              Give this day room to breathe. Set meals, link recipes, and save when the plan
              feels right.
            </p>
          </div>
          <div className="panel-actions">
            <button className="soft-button" type="button" onClick={onBackToWeek}>
              Back to week
            </button>
            <button className="soft-button" type="button" onClick={onPreviousDay}>
              Previous day
            </button>
            <button className="soft-button" type="button" onClick={onNextDay}>
              Next day
            </button>
            <button
              className="soft-button"
              type="button"
              onClick={() => void onSaveWeekPlan()}
              disabled={weekPlanPending || bootstrapStatus !== 'loaded'}
            >
              {weekPlanPending ? 'Saving week...' : 'Save day'}
            </button>
          </div>
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
                  onChange={(event) => onMealTextChange(day, meal, event.target.value)}
                />
              </label>
              <label className="field">
                <span>Link recipe</span>
                <select
                  value={selectedPlan[meal].recipeId ?? ''}
                  onChange={(event) => onRecipeLink(day, meal, event.target.value)}
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
                onChange={(event) => onSweetChange(day, event.target.value)}
              />
            </label>
          </section>
        </div>
      </section>
    </div>
  )
}
