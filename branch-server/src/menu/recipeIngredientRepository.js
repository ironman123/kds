// src/recipes/recipeIngredientRepository.js
import db from "../db.js";

/* ============================================================
   READ OPERATIONS
============================================================ */

export async function getIngredientsForRecipe(recipeId)
{
  const rows = await db('recipe_ingredients')
    .where({ recipe_id: recipeId })
    .whereNull('deleted_at') // 🛡️ SYNC: Hide deleted items
    .select('*');

  return rows.map(mapRowToIngredient);
}

export async function getIngredientsForRecipes(recipeIds)
{
  const rows = await db('recipe_ingredients')
    .whereIn('recipe_id', recipeIds)
    .whereNull('deleted_at')
    .select('*');

  return rows.map(mapRowToIngredient);
}

export async function getIngredientById(ingredientId)
{
  const row = await db('recipe_ingredients')
    .where({ id: ingredientId })
    .whereNull('deleted_at') // 🛡️ SYNC
    .first();

  return row ? mapRowToIngredient(row) : null;
}

/* ============================================================
   WRITE OPERATIONS (Single)
============================================================ */

export async function insertIngredient(ingredient)
{
  const now = Date.now();
  await db('recipe_ingredients').insert({
    id: ingredient.id,
    recipe_id: ingredient.recipeId,
    ingredient: ingredient.ingredient,
    quantity: ingredient.quantity,
    updated_at: now,       // ✅ SYNC: Needed for initial sync
    deleted_at: null       // ✅ SYNC: Explicitly active
  });
}

export async function updateIngredientQuantityRepo(ingredientId, quantity)
{
  await db('recipe_ingredients')
    .where({ id: ingredientId })
    .whereNull('deleted_at') // Safety check
    .update({
      quantity,
      updated_at: Date.now() // ✅ SYNC: Mark as "dirty"
    });
}

// Delete specific ingredient (Soft Delete)
export async function deleteIngredientRepo(ingredientId)
{
  // 🛑 STOP: No more .del()
  await db('recipe_ingredients')
    .where({ id: ingredientId })
    .update({
      deleted_at: Date.now(), // ✅ SYNC: Soft delete
      updated_at: Date.now()  // ✅ SYNC: Must update this so cloud sees the deletion!
    });
}

// Delete ALL ingredients for ONE recipe (Wipe)
export async function deleteIngredientsForRecipe(recipeId)
{
  await db('recipe_ingredients')
    .where({ recipe_id: recipeId })
    .update({
      deleted_at: Date.now(),
      updated_at: Date.now()
    });
}

/* ============================================================
   WRITE OPERATIONS (Batch)
============================================================ */

export async function insertIngredientsBatch(ingredients)
{
  const now = Date.now();
  await db('recipe_ingredients').insert(
    ingredients.map(ing => ({
      id: ing.id,
      recipe_id: ing.recipeId,
      ingredient: ing.ingredient,
      quantity: ing.quantity,
      updated_at: now,
      deleted_at: null
    }))
  );
}

// 🛑 THE NUCLEAR OPTION: Used by Owner to reset ingredients across branches
export async function deleteAllIngredientsForRecipes(recipeIds)
{
  await db('recipe_ingredients')
    .whereIn('recipe_id', recipeIds)
    .update({
      deleted_at: Date.now(),
      updated_at: Date.now()
    });
}

// Helper: Delete for single recipe
export async function deleteAllIngredientsForRecipe(recipeId)
{
  await db('recipe_ingredients')
    .where('recipe_id', recipeId)
    .update({
      deleted_at: Date.now(),
      updated_at: Date.now()
    });
}

// Soft delete batch
export async function deleteIngredientsBatch(ingredientIds)
{
  await db('recipe_ingredients')
    .whereIn('id', ingredientIds)
    .update({
      deleted_at: Date.now(),
      updated_at: Date.now()
    });
}


/* ============================================================
   HELPER
============================================================ */
function mapRowToIngredient(row)
{
  return {
    id: row.id,
    recipeId: row.recipe_id,
    ingredient: row.ingredient,
    quantity: row.quantity,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at
  };
}

