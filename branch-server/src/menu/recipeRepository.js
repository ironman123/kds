import db from "../db.js";

export function insertRecipe(recipe)
{
  db.prepare(`
    INSERT INTO recipes (id, menu_item_id, instructions, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    recipe.id,
    recipe.menuItemId,
    recipe.instructions,
    recipe.createdAt,
    recipe.updatedAt
  );
}

export function changeRecipeInstructions(recipeId, instructions)
{
  db.prepare(`
    UPDATE recipes
    SET instructions = ?, updated_at = ?
    WHERE id = ?
  `).run(instructions, Date.now(), recipeId);
}

export function getRecipeByMenuItemId(menuItemId)
{
  return db.prepare(`
    SELECT * 
    FROM recipes 
    WHERE menu_item_id = ?
  `).get(menuItemId);
}
