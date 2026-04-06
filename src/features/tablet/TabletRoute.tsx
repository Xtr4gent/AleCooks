import type { ChangeEvent } from 'react'
import { dayOrder, mealOrder, titleCase, type DayKey, type PlannerState, type Recipe } from '../planner/planner-state'

type TabletRouteProps = {
  plannerError: string
  plannerNotice: string
  sessionDisplayName: string
  state: PlannerState
  tabletDay: DayKey
  todayRecipe: Recipe | null
  onReturnToPlanner: () => void
  onSignOut: () => void | Promise<void>
  onTabletStep: (direction: -1 | 1) => void
  onTabletDayChange: (event: ChangeEvent<HTMLSelectElement>) => void
  onSelectTabletRecipe: (recipeId: string | null) => void
}

export function TabletRoute({
  plannerError,
  plannerNotice,
  sessionDisplayName,
  state,
  tabletDay,
  todayRecipe,
  onReturnToPlanner,
  onSignOut,
  onTabletStep,
  onTabletDayChange,
  onSelectTabletRecipe,
}: TabletRouteProps) {
  const tabletPlan = state.weekPlan[tabletDay]

  return (
    <div className="tablet-route-shell">
      <div className="app-toolbar">
        <div>
          <p className="section-label">Tablet mode</p>
          <strong>{sessionDisplayName}</strong>
        </div>
        <div className="toolbar-actions">
          <button className="soft-button" type="button" onClick={onReturnToPlanner}>
            Back to planner
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

      <section className="tablet-route-panel">
        <div className="tablet-route-header">
          <div>
            <p className="section-label">Kitchen display</p>
            <h1>Today&apos;s menu</h1>
            <p className="hero-text">
              Leave this open in the kitchen for a bright, one-day view of what&apos;s on deck.
            </p>
          </div>
          <div className="tablet-route-actions">
            <button className="soft-button" type="button" onClick={() => onTabletStep(-1)}>
              Previous day
            </button>
            <label className="tablet-day-picker">
              <span>Showing</span>
              <select value={tabletDay} onChange={onTabletDayChange}>
                {dayOrder.map((day) => (
                  <option key={day.key} value={day.key}>
                    {day.label}
                  </option>
                ))}
              </select>
            </label>
            <button className="soft-button" type="button" onClick={() => onTabletStep(1)}>
              Next day
            </button>
          </div>
        </div>

        <div className="tablet-preview tablet-preview--route">
          <div className="tablet-screen tablet-screen--route">
            <div className="tablet-screen__header">
              <p>Today&apos;s menu</p>
              <h3>{dayOrder.find((day) => day.key === tabletDay)?.label}</h3>
            </div>

            <div className="tablet-meals tablet-meals--route">
              {mealOrder.map((meal) => {
                const linkedRecipe = tabletPlan[meal].recipeId
                  ? state.recipes.find((recipe) => recipe.id === tabletPlan[meal].recipeId) ?? null
                  : null

                return (
                  <button
                    key={meal}
                    type="button"
                    className="tablet-meal-card tablet-meal-card--route"
                    onClick={() => onSelectTabletRecipe(linkedRecipe?.id ?? null)}
                  >
                    <span>{titleCase(meal)}</span>
                    <strong>{tabletPlan[meal].displayText || 'Nothing planned yet'}</strong>
                    <small>{linkedRecipe ? 'Tap for recipe details' : 'Simple meal note'}</small>
                  </button>
                )
              })}
            </div>

            <div className="tablet-detail tablet-detail--route">
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
                    This screen stays focused on the day. Meals first, recipe details when
                    you want them.
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
