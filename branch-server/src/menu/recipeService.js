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
    getIngredientsForRecipes,
    insertIngredientsBatch,
    deleteIngredientsBatch,
    deleteAllIngredientsForRecipes,
    deleteAllIngredientsForRecipe
} from "./recipeIngredientRepository.js";
import { logMenuEvent } from "../menu/menuEventRepository.js"; // Adjusted path
import
{
    STAFF_ROLE, assertStaffRole
} from "../staff/staffRoles.js";
import { assertBranchExists } from "../infra/branchService.js";
import { assertItemExists } from "../menu/menuItemService.js";
import { runInTransaction } from "../infra/transactionManager.js";

/* ============================================================
   PRIVATE HELPER
============================================================ */
async function getRecipeOrThrow(menuItemId, branchId)
{
    // 1. Validate Branch Existence first
    //await assertBranchExists(branchId);

    // 2. Ensure Item Exists (Secure check with branchId)
    await assertItemExists(menuItemId, branchId);

    // 3. Fetch Recipe with strict Branch Check (if branchId provided)
    const recipe = await getRecipeByMenuItemId(menuItemId, branchId);

    if (!recipe)
    {
        // If the item exists but has no recipe, we might want to throw or return null depending on UI logic.
        // Usually, every item created via service has a recipe row, even if empty.
        throw new Error("Recipe configuration not found for this menu item.");
    }
    return recipe;
}

/* ============================================================
   READ OPERATIONS
============================================================ */

export async function getRecipeDetails({ menuItemId, branchId })
{
    //if (!branchId) throw new Error("Branch ID is required");

    const recipe = await getRecipeOrThrow(menuItemId, branchId);
    const ingredients = await getIngredientsForRecipe(recipe.id);

    return {
        ...recipe,
        ingredients
    };
}

/* ============================================================
   SINGLE UPDATES (Manager / Owner for one branch)
============================================================ */

export async function updateRecipeInstructions({ menuItemId, instructions, actorId, branchId })
{
    //await assertStaff(actorId, [STAFF_ROLE.MANAGER, STAFF_ROLE.OWNER]);

    if (typeof instructions !== 'string') throw new Error("Instructions must be a string");

    const recipe = await getRecipeOrThrow(menuItemId, branchId);

    if (recipe.instructions === instructions) return recipe;

    await updateRecipeInstructionsRepo(recipe.id, instructions);

    await logMenuEvent({
        id: crypto.randomUUID(),
        branchId, // ✅ SYNC: Branch specific
        entityType: "ITEM", // We log against the ITEM ID usually so the client UI updates the item row
        entityId: menuItemId,
        type: "RECIPE_INSTRUCTIONS_UPDATED",
        oldValue: null,
        newValue: "UPDATED",
        actorId,
        createdAt: Date.now(),
    });

    return { ...recipe, instructions };
}

// --- Ingredient Management ---

export async function addIngredient({ menuItemId, ingredient, quantity, actorId, branchId })
{
    //await assertStaff(actorId, [STAFF_ROLE.MANAGER, STAFF_ROLE.OWNER]);

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
        branchId,
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
    //await assertStaff(actorId, [STAFF_ROLE.MANAGER, STAFF_ROLE.OWNER]);

    const recipe = await getRecipeOrThrow(menuItemId, branchId); // Auth check

    const ingredient = await getIngredientById(ingredientId);
    if (!ingredient || ingredient.recipeId !== recipe.id)
    {
        throw new Error("Ingredient does not belong to this recipe");
    }

    await updateIngredientQuantityRepo(ingredientId, newQuantity);

    await logMenuEvent({
        id: crypto.randomUUID(),
        branchId,
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
    //await assertStaff(actorId, [STAFF_ROLE.MANAGER, STAFF_ROLE.OWNER]);

    const recipe = await getRecipeOrThrow(menuItemId, branchId);

    const ingredient = await getIngredientById(ingredientId);
    if (!ingredient || ingredient.recipeId !== recipe.id)
    {
        throw new Error("Ingredient does not belong to this recipe");
    }

    await deleteIngredientRepo(ingredientId);

    await logMenuEvent({
        id: crypto.randomUUID(),
        branchId,
        entityType: "ITEM",
        entityId: menuItemId,
        type: "INGREDIENT_REMOVED",
        oldValue: ingredient.ingredient,
        newValue: "DELETED",
        actorId,
        createdAt: Date.now(),
    });
}

/* ============================================================
   COMPLEX EDIT (Single Branch - Transactional)
   Used by the Edit Modal in UI (Managers & Single Branch Owner)
============================================================ */

export async function editRecipe({
    menuItemId,
    branchId,
    actorId,
    instructions,
    addIngredients = [],
    updateIngredients = [],
    removeIngredientIds = [],
    replaceAllIngredients = null // 👈 NEW: Accept this parameter
})
{
    //await assertStaff(actorId, [STAFF_ROLE.MANAGER, STAFF_ROLE.OWNER]);

    const recipe = await getRecipeOrThrow(menuItemId, branchId);

    await runInTransaction(async () =>
    {
        // 1. Instructions
        if (instructions !== undefined && instructions !== recipe.instructions)
        {
            await updateRecipeInstructionsRepo(recipe.id, instructions);
        }

        // 2. Handle Ingredients
        // CASE A: Full Replacement (Frontend sends the whole list)
        if (Array.isArray(replaceAllIngredients))
        {
            // Wipe existing ingredients
            await deleteAllIngredientsForRecipe(recipe.id);

            // Insert the new list
            if (replaceAllIngredients.length > 0)
            {
                const toInsert = replaceAllIngredients.map(ing => ({
                    id: crypto.randomUUID(),
                    recipeId: recipe.id,
                    ingredient: ing.ingredient,
                    quantity: ing.quantity
                }));
                await insertIngredientsBatch(toInsert);
            }
        }
        // CASE B: Granular Updates (API usage or specific optimization)
        else
        {
            // Remove
            if (removeIngredientIds.length > 0)
            {
                await deleteIngredientsBatch(removeIngredientIds);
            }

            // Update Quantities
            for (const upd of updateIngredients)
            {
                await updateIngredientQuantityRepo(upd.ingredientId, upd.quantity);
            }

            // Add New
            if (addIngredients.length > 0)
            {
                const toInsert = addIngredients.map(ing => ({
                    id: crypto.randomUUID(),
                    recipeId: recipe.id,
                    ingredient: ing.ingredient,
                    quantity: ing.quantity
                }));
                await insertIngredientsBatch(toInsert);
            }
        }

        // 3. Log Event
        await logMenuEvent({
            id: crypto.randomUUID(),
            branchId,
            entityType: "ITEM",
            entityId: menuItemId,
            type: "RECIPE_EDITED",
            oldValue: "Previous Configuration",
            newValue: "Updated Configuration",
            actorId,
            createdAt: Date.now()
        });
    });

    return { ok: true };
}

/* ============================================================
   BATCH UPDATE (Owner / Multi-Branch)
   Standardizes a recipe across multiple locations
============================================================ */

export async function updateRecipeForBranches({
    itemName,
    targetBranchIds,
    newInstructions,
    newIngredients = null,
    actorId
})
{
    //await assertStaff(actorId, [STAFF_ROLE.OWNER]);

    if (!targetBranchIds || targetBranchIds.length === 0) throw new Error("Target branch IDs required");
    if (!itemName) throw new Error("Item name required");

    // 1. Find Recipes
    const recipes = await findRecipeIdsByItemName(itemName, targetBranchIds);
    const recipeIds = recipes.map(r => r.id);

    if (recipeIds.length === 0) return { ok: true, message: "No matching items found." };

    await runInTransaction(async () =>
    {
        // A. Instructions
        if (newInstructions)
        {
            await updateRecipeInstructionsBatch(recipeIds, newInstructions);
        }

        // B. Smart Ingredient Sync
        if (Array.isArray(newIngredients))
        {
            // 1. Fetch ALL existing ingredients for these recipes
            const allExisting = await getIngredientsForRecipes(recipeIds);

            const toInsert = [];
            const toDeleteIds = [];
            const toUpdate = [];

            // 2. Process each branch's recipe individually
            for (const rId of recipeIds)
            {
                // Get existing ingredients for THIS specific recipe
                const currentIngredients = allExisting.filter(i => i.recipeId === rId);

                // Map for fast lookup: "beef" -> IngredientObj
                const currentMap = new Map(currentIngredients.map(i => [i.ingredient.toLowerCase(), i]));

                // Set for tracking what should remain
                const newNamesSet = new Set();

                // 3. Identify Inserts and Updates
                for (const newIng of newIngredients)
                {
                    const normName = newIng.ingredient.toLowerCase();
                    newNamesSet.add(normName);

                    const existing = currentMap.get(normName);

                    if (existing)
                    {
                        // Exists: Check if quantity changed
                        if (existing.quantity !== newIng.quantity)
                        {
                            toUpdate.push({ id: existing.id, quantity: newIng.quantity });
                        }
                    }
                    else
                    {
                        // New: Needs Insert
                        toInsert.push({
                            id: crypto.randomUUID(),
                            recipeId: rId,
                            ingredient: newIng.ingredient,
                            quantity: newIng.quantity
                        });
                    }
                }

                // 4. Identify Deletions (Items in DB but NOT in new list)
                for (const existing of currentIngredients)
                {
                    if (!newNamesSet.has(existing.ingredient.toLowerCase()))
                    {
                        toDeleteIds.push(existing.id);
                    }
                }
            }

            // 5. Execute Operations
            if (toInsert.length > 0) await insertIngredientsBatch(toInsert);
            if (toDeleteIds.length > 0) await deleteIngredientsBatch(toDeleteIds);

            // Loop updates (Knex doesn't support batch update of different values easily)
            for (const upd of toUpdate)
            {
                await updateIngredientQuantityRepo(upd.id, upd.quantity);
            }
        }
    });

    // 3. Log Per Branch
    const affectedBranches = [...new Set(recipes.map(r => r.branch_id))];
    for (const bId of affectedBranches)
    {
        await logMenuEvent({
            id: crypto.randomUUID(),
            branchId: bId,
            entityType: "ITEM",
            entityId: "BATCH_OPERATION",
            type: "RECIPE_BATCH_UPDATED",
            oldValue: itemName,
            newValue: "Smart Sync Applied",
            actorId,
            createdAt: Date.now()
        });
    }

    return {
        ok: true,
        message: `Updated recipe for '${itemName}' in ${affectedBranches.length} locations.`
    };
}