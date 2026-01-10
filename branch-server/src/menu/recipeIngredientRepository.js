import db from "../db.js";

export function insertIngredient(ingredient)
{
  db.prepare(`
    INSERT INTO recipe_ingredients (id, recipe_id, ingredient, quantity)
    VALUES (?, ?, ?, ?)
  `).run(
    ingredient.id,
    ingredient.recipeId,
    ingredient.ingredient,
    ingredient.quantity
  );
}

export function updateIngredientQuantity(ingredientId, quantity)
{
  db.prepare(`
    UPDATE recipe_ingredients
    SET quantity = ?
    WHERE id = ?
  `).run(quantity, ingredientId);
}

export function deleteIngredientsForRecipe(recipeId)
{
  db.prepare(`
    DELETE FROM recipe_ingredients WHERE recipe_id = ?
  `).run(recipeId);
}

export function deleteIngredient(ingredientId)
{
  db.prepare(`
    DELETE FROM recipe_ingredients
    WHERE id = ?
  `).run(ingredientId);
}


export function getIngredientsForRecipe(recipeId)
{
  return db.prepare(`
    SELECT * FROM recipe_ingredients WHERE recipe_id = ?
  `).all(recipeId);
}

// export function getIngredientsForMenuItem(itemId)
// {
//   return db.prepare(`
//     SELECT * FROM recipe_ingredients WHERE recipe_id = ?
//   `).all(recipeId);
// }

export function getIngredientById(ingredientId)
{
  return db.prepare(`
    SELECT * FROM recipe_ingredients WHERE id = ?
    `).get(ingredientId);
}