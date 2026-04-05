import type { Session, User } from 'better-auth'

import { prisma } from './db.js'

export async function getPlannerBootstrap(userId: string) {
  const [recipes, latestWeekPlan] = await Promise.all([
    prisma.recipe.findMany({
      where: { userId },
      include: {
        ingredients: {
          orderBy: { sortOrder: 'asc' },
        },
        categoryLinks: {
          include: {
            category: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.weekPlan.findFirst({
      where: { userId },
      orderBy: { weekStartDate: 'desc' },
      include: {
        mealSlots: true,
        sweetSlots: true,
        shoppingLists: {
          orderBy: { generatedAt: 'desc' },
          take: 1,
          include: {
            items: {
              include: {
                recipeSources: true,
              },
              orderBy: { createdAt: 'asc' },
            },
          },
        },
      },
    }),
  ])

  return {
    recipes: recipes.map((recipe) => ({
      id: recipe.id,
      title: recipe.title,
      sourceUrl: recipe.sourceUrl ?? '',
      notes: recipe.notes,
      categories: recipe.categoryLinks.map((link) => link.category.name),
      ingredients: recipe.ingredients.map((ingredient) => ingredient.text),
    })),
    latestWeekPlan: latestWeekPlan
      ? {
          id: latestWeekPlan.id,
          weekStartDate: latestWeekPlan.weekStartDate.toISOString(),
          mealSlots: latestWeekPlan.mealSlots,
          sweetSlots: latestWeekPlan.sweetSlots,
          shoppingList:
            latestWeekPlan.shoppingLists[0]
              ? {
                  generatedAt: latestWeekPlan.shoppingLists[0].generatedAt.toISOString(),
                  items: latestWeekPlan.shoppingLists[0].items.map((item) => ({
                    id: item.id,
                    text: item.text,
                    checked: item.checked,
                    manual: item.manual,
                    sourceRecipeIds: item.recipeSources.map((source) => source.recipeId),
                  })),
                }
              : null,
        }
      : null,
  }
}

export type BootstrapResponse = {
  session: Session
  user: User
  plannerData: Awaited<ReturnType<typeof getPlannerBootstrap>>
}
