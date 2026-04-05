import { z } from 'zod'

import { prisma } from './db.js'

const mealSlotSchema = z.object({
  displayText: z.string(),
  recipeId: z.string().nullable(),
})

const dayPlanSchema = z.object({
  breakfast: mealSlotSchema,
  lunch: mealSlotSchema,
  dinner: mealSlotSchema,
  sweet: z.string(),
})

export const createRecipeSchema = z.object({
  title: z.string().trim().min(1),
  sourceUrl: z.string().trim().default(''),
  notes: z.string().default(''),
  categories: z.array(z.string().trim().min(1)).min(1),
  ingredients: z.array(z.string().trim().min(1)),
})

export const saveWeekPlanSchema = z.object({
  weekStartDate: z.string().datetime(),
  days: z.object({
    monday: dayPlanSchema,
    tuesday: dayPlanSchema,
    wednesday: dayPlanSchema,
    thursday: dayPlanSchema,
    friday: dayPlanSchema,
    saturday: dayPlanSchema,
    sunday: dayPlanSchema,
  }),
})

export const generateShoppingListSchema = z.object({
  weekStartDate: z.string().datetime(),
})

export const saveShoppingListSchema = z.object({
  weekStartDate: z.string().datetime(),
  items: z.array(
    z.object({
      text: z.string().trim().min(1),
      checked: z.boolean(),
      manual: z.boolean(),
      sourceRecipeIds: z.array(z.string()),
    }),
  ),
})

const orderedDayKeys = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const

const orderedMealKeys = ['breakfast', 'lunch', 'dinner'] as const

function serializeRecipe(recipe: Awaited<ReturnType<typeof getRecipes>>[number]) {
  return {
    id: recipe.id,
    title: recipe.title,
    sourceUrl: recipe.sourceUrl ?? '',
    notes: recipe.notes,
    categories: recipe.categoryLinks.map((link) => link.category.name),
    ingredients: recipe.ingredients.map((ingredient) => ingredient.text),
  }
}

function serializeWeekPlan(
  weekPlan: Awaited<ReturnType<typeof getLatestWeekPlan>>,
) {
  if (!weekPlan) {
    return null
  }

  return {
    id: weekPlan.id,
    weekStartDate: weekPlan.weekStartDate.toISOString(),
    mealSlots: weekPlan.mealSlots.map((slot) => ({
      id: slot.id,
      dayKey: slot.dayKey,
      mealKey: slot.mealKey,
      displayText: slot.displayText,
      recipeId: slot.recipeId,
    })),
    sweetSlots: weekPlan.sweetSlots.map((slot) => ({
      id: slot.id,
      dayKey: slot.dayKey,
      displayText: slot.displayText,
    })),
    shoppingList:
      weekPlan.shoppingLists[0]
        ? {
            id: weekPlan.shoppingLists[0].id,
            generatedAt: weekPlan.shoppingLists[0].generatedAt.toISOString(),
            items: weekPlan.shoppingLists[0].items.map((item) => ({
              id: item.id,
              text: item.text,
              checked: item.checked,
              manual: item.manual,
              sourceRecipeIds: item.recipeSources.map((source) => source.recipeId),
            })),
          }
        : null,
  }
}

async function getRecipes(userId: string) {
  return prisma.recipe.findMany({
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
  })
}

async function getLatestWeekPlan(userId: string) {
  return prisma.weekPlan.findFirst({
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
  })
}

async function getWeekPlanByStartDate(userId: string, weekStartDate: Date) {
  return prisma.weekPlan.findUnique({
    where: {
      userId_weekStartDate: {
        userId,
        weekStartDate,
      },
    },
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
  })
}

export async function getPlannerBootstrap(userId: string) {
  const [recipes, latestWeekPlan] = await Promise.all([
    getRecipes(userId),
    getLatestWeekPlan(userId),
  ])

  return {
    recipes: recipes.map(serializeRecipe),
    latestWeekPlan: serializeWeekPlan(latestWeekPlan),
  }
}

export async function createRecipeForUser(
  userId: string,
  input: z.infer<typeof createRecipeSchema>,
) {
  const categoryNames = [...new Set(input.categories.map((category) => category.trim()))]
  const normalizedSourceUrl = input.sourceUrl.trim() || null

  const recipe = await prisma.$transaction(async (tx) => {
    const categories = await Promise.all(
      categoryNames.map((name) =>
        tx.recipeCategory.upsert({
          where: {
            userId_name: {
              userId,
              name,
            },
          },
          update: {},
          create: {
            userId,
            name,
          },
        }),
      ),
    )

    return tx.recipe.create({
      data: {
        userId,
        title: input.title.trim(),
        sourceUrl: normalizedSourceUrl,
        notes: input.notes.trim(),
        ingredients: {
          create: input.ingredients.map((ingredient, index) => ({
            text: ingredient.trim(),
            sortOrder: index,
          })),
        },
        categoryLinks: {
          create: categories.map((category) => ({
            categoryId: category.id,
          })),
        },
      },
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
    })
  })

  return serializeRecipe(recipe)
}

export async function saveWeekPlanForUser(
  userId: string,
  input: z.infer<typeof saveWeekPlanSchema>,
) {
  const weekStartDate = new Date(input.weekStartDate)

  const weekPlan = await prisma.$transaction(async (tx) => {
    const upserted = await tx.weekPlan.upsert({
      where: {
        userId_weekStartDate: {
          userId,
          weekStartDate,
        },
      },
      update: {},
      create: {
        userId,
        weekStartDate,
      },
    })

    await tx.mealSlot.deleteMany({
      where: { weekPlanId: upserted.id },
    })

    await tx.sweetSlot.deleteMany({
      where: { weekPlanId: upserted.id },
    })

    await tx.mealSlot.createMany({
      data: orderedDayKeys.flatMap((dayKey) =>
        orderedMealKeys.map((mealKey) => ({
          weekPlanId: upserted.id,
          dayKey,
          mealKey,
          displayText: input.days[dayKey][mealKey].displayText,
          recipeId: input.days[dayKey][mealKey].recipeId,
        })),
      ),
    })

    await tx.sweetSlot.createMany({
      data: orderedDayKeys.map((dayKey) => ({
        weekPlanId: upserted.id,
        dayKey,
        displayText: input.days[dayKey].sweet,
      })),
    })

    return tx.weekPlan.findUniqueOrThrow({
      where: { id: upserted.id },
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
    })
  })

  return serializeWeekPlan(weekPlan)
}

export async function generateShoppingListForUser(
  userId: string,
  input: z.infer<typeof generateShoppingListSchema>,
) {
  const weekStartDate = new Date(input.weekStartDate)
  const weekPlan = await getWeekPlanByStartDate(userId, weekStartDate)

  if (!weekPlan) {
    throw new Error('WEEK_PLAN_NOT_FOUND')
  }

  const linkedRecipeIds = [...new Set(weekPlan.mealSlots.map((slot) => slot.recipeId).filter(Boolean))]

  const recipes = await prisma.recipe.findMany({
    where: {
      userId,
      id: {
        in: linkedRecipeIds as string[],
      },
    },
    include: {
      ingredients: {
        orderBy: { sortOrder: 'asc' },
      },
    },
  })

  const itemMap = new Map<
    string,
    {
      text: string
      sourceRecipeIds: string[]
    }
  >()

  recipes.forEach((recipe) => {
    recipe.ingredients.forEach((ingredient) => {
      const key = ingredient.text.trim().toLowerCase()
      const existing = itemMap.get(key)

      if (existing) {
        existing.sourceRecipeIds = [...new Set([...existing.sourceRecipeIds, recipe.id])]
        return
      }

      itemMap.set(key, {
        text: ingredient.text,
        sourceRecipeIds: [recipe.id],
      })
    })
  })

  return saveShoppingListForUser(userId, {
    weekStartDate: input.weekStartDate,
    items: [...itemMap.values()].map((item) => ({
      text: item.text,
      checked: false,
      manual: false,
      sourceRecipeIds: item.sourceRecipeIds,
    })),
  })
}

export async function saveShoppingListForUser(
  userId: string,
  input: z.infer<typeof saveShoppingListSchema>,
) {
  const weekStartDate = new Date(input.weekStartDate)
  const weekPlan = await getWeekPlanByStartDate(userId, weekStartDate)

  if (!weekPlan) {
    throw new Error('WEEK_PLAN_NOT_FOUND')
  }

  const shoppingList = await prisma.$transaction(async (tx) => {
    await tx.shoppingList.deleteMany({
      where: { weekPlanId: weekPlan.id },
    })

    return tx.shoppingList.create({
      data: {
        weekPlanId: weekPlan.id,
        generatedAt: new Date(),
        items: {
          create: input.items.map((item) => ({
            text: item.text,
            checked: item.checked,
            manual: item.manual,
            recipeSources: {
              create: item.sourceRecipeIds.map((recipeId) => ({
                recipeId,
              })),
            },
          })),
        },
      },
      include: {
        items: {
          include: {
            recipeSources: true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    })
  })

  return {
    id: shoppingList.id,
    generatedAt: shoppingList.generatedAt.toISOString(),
    items: shoppingList.items.map((item) => ({
      id: item.id,
      text: item.text,
      checked: item.checked,
      manual: item.manual,
      sourceRecipeIds: item.recipeSources.map((source) => source.recipeId),
    })),
  }
}
