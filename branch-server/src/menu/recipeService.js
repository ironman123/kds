import crypto from "crypto";
import
{
    getRecipeByMenuItemId,
    updateRecipeInstructionsRepo,
    findRecipeIdsByItemName,
    updateRecipeInstructionsBatch
} from "./recipeRepository.js";
import
{
    getIngredientById,
    insertIngredient,
    updateIngredientQuantityRepo,
    deleteIngredientRepo,
    getIngredientsForRecipe,
    insertIngredientsBatch,
    deleteIngredientsBatch,
    deleteAllIngredientsForRecipes,
    deleteAllIngredientsForRecipe
} from "./recipeIngredientRepository.js";
import { logMenuEvent } from "./menuEventRepository.js";
import { STAFF_ROLE, assertStaffRole } from "../staff/staffRoles.js";
import { assertBranchExists } from "../infra/branchService.js";
import { assertItemExists } from "./menuItemService.js"; // Renamed for clarity in your imports
import { runInTransaction } from "../infra/transactionManager.js";

/* ============================================================
   PRIVATE HELPER
============================================================ */
async function getRecipeOrThrow(menuItemId, branchId)
{
    // 1. Validate Branch Existence first
    await assertBranchExists(branchId);

    // 2. Ensure Item Exists (Secure check with branchId)
    await assertItemExists(menuItemId, branchId);

    // 3. Fetch Recipe with strict Branch Check
    const recipe = await getRecipeByMenuItemId(menuItemId, branchId);
    if (!recipe)
    {
        throw new Error("Recipe not found for this menu item in this branch");
    }
    return recipe;
}

/* ============================================================
   READ OPERATIONS
============================================================ */

export async function getRecipeDetails({ menuItemId, branchId })
{
    if (!branchId) throw new Error("Branch ID is required");

    const recipe = await getRecipeOrThrow(menuItemId, branchId);
    const ingredients = await getIngredientsForRecipe(recipe.id);

    return {
        ...recipe,
        ingredients
    };
}

export async function getRecipeForMenuItem(menuItemId, branchId)
{
    return getRecipeOrThrow(menuItemId, branchId);
}

export async function listIngredientsForMenuItem(menuItemId, branchId)
{
    const recipe = await getRecipeByMenuItemId(menuItemId, branchId);
    if (!recipe) return [];
    return getIngredientsForRecipe(recipe.id);
}

/* ============================================================
   SINGLE UPDATES (Instructions & Ingredients)
============================================================ */

export async function updateRecipeInstructions({ menuItemId, instructions, actorId, branchId })
{
    await assertBranchExists(branchId);
    await assertStaffRole(actorId, [STAFF_ROLE.MANAGER, STAFF_ROLE.OWNER]);

    if (typeof instructions !== 'string')
    {
        throw new Error("Instructions must be a string");
    }

    const recipe = await getRecipeOrThrow(menuItemId, branchId);

    if (recipe.instructions === instructions) return recipe;

    await updateRecipeInstructionsRepo(recipe.id, instructions);

    await logMenuEvent({
        id: crypto.randomUUID(),
        branchId, // 👈 CHANGED: Added branchId
        entityType: "ITEM",
        entityId: menuItemId,
        type: "RECIPE_INSTRUCTIONS_UPDATED",
        oldValue: "...",
        newValue: "UPDATED",
        actorId,
        createdAt: Date.now(),
    });

    return { ...recipe, instructions };
}

export async function addIngredient({ menuItemId, ingredient, quantity, actorId, branchId })
{
    await assertBranchExists(branchId);
    await assertStaffRole(actorId, [STAFF_ROLE.MANAGER, STAFF_ROLE.OWNER]);

    const recipe = await getRecipeOrThrow(menuItemId, branchId);

    if (!ingredient || !quantity) throw new Error("Ingredient name and Quantity are required");

    await insertIngredient({
        id: crypto.randomUUID(),
        recipeId: recipe.id,
        ingredient,
        quantity,
    });

    await logMenuEvent({
        id: crypto.randomUUID(),
        branchId, // 👈 CHANGED
        entityType: "ITEM",
        entityId: menuItemId,
        type: "INGREDIENT_ADDED",
        oldValue: null,
        newValue: `${ingredient} (${quantity})`,
        actorId,
        createdAt: Date.now(),
    });
}

export async function changeIngredientQuantity({ menuItemId, ingredientId, newQuantity, actorId, branchId })
{
    await assertBranchExists(branchId);
    await assertStaffRole(actorId, [STAFF_ROLE.MANAGER, STAFF_ROLE.OWNER]);

    const recipe = await getRecipeOrThrow(menuItemId, branchId);

    const ingredient = await getIngredientById(ingredientId);
    if (!ingredient || ingredient.recipeId !== recipe.id)
    {
        throw new Error("Ingredient does not belong to this recipe");
    }

    await updateIngredientQuantityRepo(ingredientId, newQuantity);

    await logMenuEvent({
        id: crypto.randomUUID(),
        branchId, // 👈 CHANGED
        entityType: "ITEM",
        entityId: menuItemId,
        type: "INGREDIENT_QUANTITY_UPDATED",
        oldValue: ingredient.quantity,
        newValue: newQuantity,
        actorId,
        createdAt: Date.now(),
    });
}

export async function removeIngredient({ menuItemId, ingredientId, actorId, branchId })
{
    await assertBranchExists(branchId);
    await assertStaffRole(actorId, [STAFF_ROLE.MANAGER, STAFF_ROLE.OWNER]);

    const recipe = await getRecipeOrThrow(menuItemId, branchId);

    const ingredient = await getIngredientById(ingredientId);
    if (!ingredient || ingredient.recipeId !== recipe.id)
    {
        throw new Error("Ingredient does not belong to this recipe");
    }

    await deleteIngredientRepo(ingredientId); // Note: Ensure you imported deleteIngredientRepo as removeIngredientRepo or fixed name

    await logMenuEvent({
        id: crypto.randomUUID(),
        branchId, // 👈 CHANGED
        entityType: "ITEM",
        entityId: menuItemId,
        type: "INGREDIENT_REMOVED",
        oldValue: ingredient.ingredient,
        newValue: null,
        actorId,
        createdAt: Date.now(),
    });
}

export async function removeAllIngredients({ menuItemId, actorId, branchId })
{
    await assertBranchExists(branchId);
    await assertStaffRole(actorId, [STAFF_ROLE.MANAGER, STAFF_ROLE.OWNER]);

    const recipe = await getRecipeOrThrow(menuItemId, branchId);

    await deleteAllIngredientsForRecipe(recipe.id);

    await logMenuEvent({
        id: crypto.randomUUID(),
        branchId, // 👈 CHANGED
        entityType: "ITEM",
        entityId: menuItemId,
        type: "ALL_INGREDIENTS_REMOVED",
        oldValue: null,
        newValue: null,
        actorId,
        createdAt: Date.now(),
    });
}

/* ============================================================
   COMPLEX EDIT (Transaction + Batch Optimized)
============================================================ */

export async function editRecipe({
    menuItemId,
    branchId,
    actorId,
    instructions,
    addIngredients = [],
    updateIngredients = [],
    removeIngredientIds = [],
    replaceAllIngredients = null
})
{
    await assertBranchExists(branchId);
    await assertStaffRole(actorId, [STAFF_ROLE.MANAGER, STAFF_ROLE.OWNER]);

    const recipe = await getRecipeOrThrow(menuItemId, branchId);
    const logs = [];

    await runInTransaction(async () =>
    {
        // 1. Update Instructions
        if (instructions !== undefined && instructions !== recipe.instructions)
        {
            if (typeof instructions !== 'string') throw new Error("Instructions must be a string");
            await updateRecipeInstructionsRepo(recipe.id, instructions);
            logs.push({ type: "RECIPE_INSTRUCTIONS_UPDATED", newValue: "UPDATED" });
        }

        // 2. Handling Ingredients
        // CASE A: Full Replacement
        if (Array.isArray(replaceAllIngredients))
        {
            await deleteAllIngredientsForRecipe(recipe.id);
            logs.push({ type: "ALL_INGREDIENTS_REMOVED" });

            if (replaceAllIngredients.length > 0)
            {
                const toInsert = replaceAllIngredients.map(ing => ({
                    id: crypto.randomUUID(),
                    recipeId: recipe.id,
                    ingredient: ing.ingredient,
                    quantity: ing.quantity
                }));
                await insertIngredientsBatch(toInsert);
                logs.push({ type: "INGREDIENTS_REPLACED", newValue: `${toInsert.length} items` });
            }
        }
        // CASE B: Granular Updates
        else
        {
            const currentIngredients = await getIngredientsForRecipe(recipe.id);
            const validIds = new Set(currentIngredients.map(i => i.id));

            if (removeIngredientIds.length > 0)
            {
                removeIngredientIds.forEach(id =>
                {
                    if (!validIds.has(id)) throw new Error(`Ingredient ${id} does not belong to this recipe`);
                });
                await deleteIngredientsBatch(removeIngredientIds);
                logs.push({ type: "INGREDIENTS_REMOVED", newValue: `${removeIngredientIds.length} items` });
            }

            if (updateIngredients.length > 0)
            {
                for (const upd of updateIngredients)
                {
                    if (!validIds.has(upd.ingredientId)) throw new Error(`Ingredient ${upd.ingredientId} does not belong to this recipe`);
                    await updateIngredientQuantityRepo(upd.ingredientId, upd.quantity);
                }
                logs.push({ type: "INGREDIENT_QUANTITIES_UPDATED", newValue: `${updateIngredients.length} items` });
            }

            if (addIngredients.length > 0)
            {
                const toInsert = addIngredients.map(ing => ({
                    id: crypto.randomUUID(),
                    recipeId: recipe.id,
                    ingredient: ing.ingredient,
                    quantity: ing.quantity
                }));
                await insertIngredientsBatch(toInsert);
                logs.push({ type: "INGREDIENTS_ADDED", newValue: `${toInsert.length} items` });
            }
        }

        // 3. Log Everything
        for (const log of logs)
        {
            await logMenuEvent({
                id: crypto.randomUUID(),
                branchId, // 👈 CHANGED
                entityType: "ITEM",
                entityId: menuItemId,
                type: log.type,
                oldValue: null,
                newValue: log.newValue || null,
                actorId,
                createdAt: Date.now()
            });
        }
    });

    return { ok: true, message: "Recipe updated successfully" };
}

/* ============================================================
   BATCH UPDATE (Owner / Multi-Branch)
============================================================ */

export async function updateRecipeForBranches({
    itemName,
    targetBranchIds,
    newInstructions,
    newIngredients = null,
    actorId
})
{
    await assertStaffRole(actorId, [STAFF_ROLE.OWNER]);

    if (!targetBranchIds || targetBranchIds.length === 0) throw new Error("Target branch IDs required");
    if (!itemName) throw new Error("Item name required");

    // 1. Find Recipes + Branch IDs
    // (Ensure your Repo returns 'branch_id' in this function!)
    const recipes = await findRecipeIdsByItemName(itemName, targetBranchIds);
    const recipeIds = recipes.map(r => r.id);

    if (recipeIds.length === 0)
    {
        return { ok: true, message: "No matching items found to update." };
    }

    await runInTransaction(async () =>
    {
        // 2. Update Instructions
        if (newInstructions)
        {
            await updateRecipeInstructionsBatch(recipeIds, newInstructions);
        }

        // 3. Standardize Ingredients
        if (Array.isArray(newIngredients))
        {
            await deleteAllIngredientsForRecipes(recipeIds);

            const ingredientsToInsert = [];
            for (const rId of recipeIds)
            {
                for (const ing of newIngredients)
                {
                    ingredientsToInsert.push({
                        id: crypto.randomUUID(),
                        recipeId: rId,
                        ingredient: ing.ingredient,
                        quantity: ing.quantity
                    });
                }
            }
            if (ingredientsToInsert.length > 0)
            {
                await insertIngredientsBatch(ingredientsToInsert);
            }
        }
    });

    // 4. Log Per Branch (Better for Sync)
    // We group by branch so each branch gets 1 log event
    const affectedBranches = [...new Set(recipes.map(r => r.branch_id || r.branchId))];

    for (const bId of affectedBranches)
    {
        if (!bId) continue;
        await logMenuEvent({
            id: crypto.randomUUID(),
            branchId: bId, // 👈 CHANGED: Log specifically for this branch
            entityType: "ITEM",
            entityId: "BATCH_OPERATION",
            type: "RECIPE_BATCH_UPDATED",
            oldValue: itemName,
            newValue: "Standardized by Owner",
            actorId,
            createdAt: Date.now()
        });
    }

    return {
        ok: true,
        message: `Updated recipe for '${itemName}' in ${recipeIds.length} locations.`
    };
}