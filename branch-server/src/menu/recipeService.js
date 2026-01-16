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
    deleteAllIngredientsForRecipes, // Plural (Batch)
    deleteAllIngredientsForRecipe   // Singular (Single Edit)
} from "./recipeIngredientRepository.js";
import { logMenuEvent } from "./menuEventRepository.js";
import { STAFF_ROLE, assertStaffRole } from "../staff/staffRoles.js";
import { assertBranchExists } from "../infra/branchService.js";
import { assertItemExists } from "./menuItemService.js"; // ✅ Correct Import
import { runInTransaction } from "../infra/transactionManager.js";

/* ============================================================
   PRIVATE HELPER
============================================================ */
async function getRecipeOrThrow(menuItemId, branchId)
{
    // 1. Validate Branch Existence first
    await assertBranchExists(branchId);

    // 2. Ensure Item Exists (Secure check with branchId)
    await ensureItemExists(menuItemId, branchId);

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

    // We reuse the secure helper
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
    if (!recipe) return []; // Return empty if no recipe exists yet
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

    if (recipe.instructions === instructions) return recipe; // No-op

    await updateRecipeInstructionsRepo(recipe.id, instructions);

    await logMenuEvent({
        id: crypto.randomUUID(),
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

    // Verify ingredient belongs to this recipe
    const ingredient = await getIngredientById(ingredientId);
    if (!ingredient || ingredient.recipeId !== recipe.id)
    {
        throw new Error("Ingredient does not belong to this recipe");
    }

    await updateIngredientQuantityRepo(ingredientId, newQuantity);

    await logMenuEvent({
        id: crypto.randomUUID(),
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

    await deleteIngredientRepo(ingredientId);

    await logMenuEvent({
        id: crypto.randomUUID(),
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
    updateIngredients = [], // [{ ingredientId, quantity }]
    removeIngredientIds = [],
    replaceAllIngredients = null // array OR null
})
{
    await assertBranchExists(branchId);
    await assertStaffRole(actorId, [STAFF_ROLE.MANAGER, STAFF_ROLE.OWNER]);

    // Secure fetch
    const recipe = await getRecipeOrThrow(menuItemId, branchId);

    const logs = [];

    // START TRANSACTION (Safety Lock)
    await runInTransaction(async () =>
    {

        // 1. Update Instructions (Optional)
        if (instructions !== undefined && instructions !== recipe.instructions)
        {
            if (typeof instructions !== 'string') throw new Error("Instructions must be a string");

            await updateRecipeInstructionsRepo(recipe.id, instructions);
            logs.push({ type: "RECIPE_INSTRUCTIONS_UPDATED", newValue: "UPDATED" });
        }

        // 2. Handling Ingredients

        // CASE A: Full Replacement ("Wipe & Replace" strategy)
        if (Array.isArray(replaceAllIngredients))
        {
            // Delete ALL existing ingredients for this recipe
            await deleteAllIngredientsForRecipe(recipe.id); // Singular version
            logs.push({ type: "ALL_INGREDIENTS_REMOVED" });

            // Insert ALL new ingredients in one Batch Call
            if (replaceAllIngredients.length > 0)
            {
                const toInsert = replaceAllIngredients.map(ing =>
                {
                    if (!ing.ingredient || !ing.quantity) throw new Error("Invalid ingredient payload in replaceAll");
                    return {
                        id: crypto.randomUUID(),
                        recipeId: recipe.id,
                        ingredient: ing.ingredient,
                        quantity: ing.quantity
                    };
                });

                await insertIngredientsBatch(toInsert);
                logs.push({ type: "INGREDIENTS_REPLACED", newValue: `${toInsert.length} items` });
            }
        }
        // CASE B: Granular Updates (Add/Edit/Remove specific items)
        else
        {
            // Validate Ownership: Do these ingredients belong to this recipe?
            const currentIngredients = await getIngredientsForRecipe(recipe.id);
            const validIds = new Set(currentIngredients.map(i => i.id));

            // B1. Batch Remove
            if (removeIngredientIds.length > 0)
            {
                removeIngredientIds.forEach(id =>
                {
                    if (!validIds.has(id)) throw new Error(`Ingredient ${id} does not belong to this recipe`);
                });

                await deleteIngredientsBatch(removeIngredientIds);
                logs.push({ type: "INGREDIENTS_REMOVED", newValue: `${removeIngredientIds.length} items` });
            }

            // B2. Update Quantities
            if (updateIngredients.length > 0)
            {
                for (const upd of updateIngredients)
                {
                    if (!validIds.has(upd.ingredientId)) throw new Error(`Ingredient ${upd.ingredientId} does not belong to this recipe`);
                    if (!upd.quantity) throw new Error("Quantity required for update");

                    await updateIngredientQuantityRepo(upd.ingredientId, upd.quantity);
                }
                logs.push({ type: "INGREDIENT_QUANTITIES_UPDATED", newValue: `${updateIngredients.length} items` });
            }

            // B3. Batch Add
            if (addIngredients.length > 0)
            {
                const toInsert = addIngredients.map(ing =>
                {
                    if (!ing.ingredient || !ing.quantity) throw new Error("Invalid ingredient payload in addIngredients");
                    return {
                        id: crypto.randomUUID(),
                        recipeId: recipe.id,
                        ingredient: ing.ingredient,
                        quantity: ing.quantity
                    };
                });

                await insertIngredientsBatch(toInsert);
                logs.push({ type: "INGREDIENTS_ADDED", newValue: `${toInsert.length} items` });
            }
        }

        // 3. Log Everything
        for (const log of logs)
        {
            await logMenuEvent({
                id: crypto.randomUUID(),
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
    newIngredients = null, // Array or null. If provided, it REPLACES old ingredients.
    actorId
})
{
    await assertStaffRole(actorId, [STAFF_ROLE.OWNER]);

    // Guardrails
    if (!targetBranchIds || !Array.isArray(targetBranchIds) || targetBranchIds.length === 0)
    {
        throw new Error("Target branch IDs required (Array)");
    }
    if (!itemName) throw new Error("Item name required");

    // 1. Find the Recipes IDs in those branches
    const recipes = await findRecipeIdsByItemName(itemName, targetBranchIds);
    const recipeIds = recipes.map(r => r.id);

    if (recipeIds.length === 0)
    {
        return { ok: true, message: "No matching items found to update." };
    }

    await runInTransaction(async () =>
    {
        // 2. Update Instructions (Batch)
        if (newInstructions)
        {
            await updateRecipeInstructionsBatch(recipeIds, newInstructions);
        }

        // 3. Standardize Ingredients (Batch)
        // Strategy: Wipe & Replace
        if (Array.isArray(newIngredients))
        {
            // A. Batch Wipe
            await deleteAllIngredientsForRecipes(recipeIds); // Plural version

            // B. Prepare Batch Insert
            const ingredientsToInsert = [];

            for (const rId of recipeIds)
            {
                for (const ing of newIngredients)
                {
                    if (!ing.ingredient || !ing.quantity) throw new Error("Invalid ingredient payload");
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

    // 4. Log
    await logMenuEvent({
        id: crypto.randomUUID(),
        entityType: "ITEM",
        entityId: "BATCH_OPERATION",
        type: "RECIPE_BATCH_UPDATED",
        oldValue: itemName,
        newValue: `Updated in ${recipeIds.length} locations`,
        actorId,
        createdAt: Date.now()
    });

    return {
        ok: true,
        message: `Updated recipe for '${itemName}' in ${recipeIds.length} locations.`
    };
}