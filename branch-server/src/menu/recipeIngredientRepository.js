import db from "../db.js";

/* ============================================================
   READ OPERATIONS
============================================================ */

export async function getIngredientsForRecipe(recipeId)
{
  const rows = await db('recipe_ingredients')
    .where({ recipe_id: recipeId })
    .select('*');

  return rows.map(mapRowToIngredient);
}

export async function getIngredientById(ingredientId)
{
  const row = await db('recipe_ingredients')
    .where({ id: ingredientId })
    .first();

  return row ? mapRowToIngredient(row) : null;
}

/* ============================================================
   WRITE OPERATIONS (Single)
============================================================ */

export async function insertIngredient(ingredient)
{
  await db('recipe_ingredients').insert({
    id: ingredient.id,
    recipe_id: ingredient.recipeId,
    ingredient: ingredient.ingredient,
    quantity: ingredient.quantity
  });
}

export async function updateIngredientQuantityRepo(ingredientId, quantity)
{
  await db('recipe_ingredients')
    .where({ id: ingredientId })
    .update({ quantity });
}

// Delete specific ingredient (e.g., remove "Salt" from this recipe)
export async function deleteIngredientRepo(ingredientId)
{
  await db('recipe_ingredients')
    .where({ id: ingredientId })
    .del();
}

// Delete ALL ingredients for ONE recipe (Wipe)
export async function deleteIngredientsForRecipe(recipeId)
{
  await db('recipe_ingredients')
    .where({ recipe_id: recipeId })
    .del();
}

/* ============================================================
   WRITE OPERATIONS (Batch)
   (Critical for Bulk Edits & Multi-Branch Standardization)
============================================================ */

// 🚀 WHAT: Inserts multiple ingredients in one SQL call.
// 🛡️ WHY:  Performance. Used when creating a new recipe with 10 ingredients, 
//          or pushing a standard recipe to 50 branches.
export async function insertIngredientsBatch(ingredients)
{
  await db('recipe_ingredients').insert(
    ingredients.map(ing => ({
      id: ing.id,
      recipe_id: ing.recipeId,
      ingredient: ing.ingredient,
      quantity: ing.quantity
    }))
  );
}

// 🚀 WHAT: Deletes a specific list of ingredients by ID.
// 🛡️ WHY:  Used when editing a recipe and removing 3 specific items at once.
export async function deleteIngredientsBatch(ingredientIds)
{
  await db('recipe_ingredients')
    .whereIn('id', ingredientIds)
    .del();
}

// 🚀 WHAT: Deletes ALL ingredients for MULTIPLE recipes.
// 🛡️ WHY:  The "Nuclear Option" for Standardization. 
//          When the Owner pushes a new recipe to 10 branches, we first WIPE 
//          the old ingredients from all 10 branches using this function.
export async function deleteAllIngredientsForRecipes(recipeIds)
{
  await db('recipe_ingredients')
    .whereIn('recipe_id', recipeIds)
    .del();
}

export async function deleteAllIngredientsForRecipe(recipeId)
{
  await db('recipe_ingredients')
    .where('recipe_id', recipeId)
    .del();
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
    quantity: row.quantity
  };
}