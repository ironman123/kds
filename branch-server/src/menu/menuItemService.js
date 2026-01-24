import crypto from "crypto";
import
{
    insertMenuItem,
    getMenuItemById,
    getMenuItemByNameInCategory,
    updateMenuItemRepo,
    listMenuItemsRepo,
    deleteMenuItemRepo,
    findItemsByNameInBranches,
    updateMenuItemsBatch,
    deleteMenuItemsBatch,
    insertMenuItemsBatch,
    findItemIdsByName,
    updateItemCategoriesBatch
} from "./menuItemRepository.js";
import
{
    getCategoryById,
    getCategoryByName,
    findCategoryIdsByName
} from "./menuCategoryRepository.js";
import { STAFF_ROLE, assertStaffRole } from "../staff/staffRoles.js";
import { assertBranchExists } from "../infra/branchService.js";
import { logMenuEvent } from "./menuEventRepository.js";
import { runInTransaction } from "../infra/transactionManager.js";
import { insertRecipe, getRecipeByMenuItemId, deleteRecipeRepo } from "./recipeRepository.js";
import { insertIngredient, deleteAllIngredientsForRecipe } from "./recipeIngredientRepository.js";

/* ============================================================
   PRIVATE HELPER
============================================================ */
async function getItemOrThrow(itemId, branchId)
{
    const item = await getMenuItemById(itemId, branchId);
    if (!item)
    {
        throw new Error("Menu item not found in this branch");
    }
    return item;
}

// ✅ NEW EXPORT: Allows other services (like Recipe) to check if an item exists
// 🛡️ SECURITY: Requires branchId to ensure Tenant Isolation
export async function assertItemExists(itemId, branchId)
{
    //if (!branchId) throw new Error("Branch ID is required to verify item existence");
    // We use the existing repo function which already has the JOIN check
    const item = await getMenuItemById(itemId, branchId);
    if (!item)
    {
        throw new Error("Menu item not found in this branch");
    }
    return item;
}

/* ============================================================
   CREATE (Single Branch)
============================================================ */

export async function createMenuItem({ categoryId, name, price, prepTime, recipeInstructions, ingredients, actorId, branchId })
{
    if (!branchId) throw new Error("Branch ID is required");
    await assertBranchExists(branchId);
    await assertStaffRole(actorId, [STAFF_ROLE.MANAGER, STAFF_ROLE.OWNER]);

    // 1. FAIL FAST: Input Validation
    if (!name || typeof name !== 'string' || name.trim() === '') throw new Error("Item name is required and must be a string");
    if (!price || price <= 0) throw new Error("Price must be greater than 0");
    if (!recipeInstructions || typeof recipeInstructions !== 'string') throw new Error("Recipe instructions are required");

    // STRICT INGREDIENT CHECK: If ingredients provided, MUST be array
    if (ingredients !== undefined && !Array.isArray(ingredients))
    {
        throw new Error("Ingredients must be a list (array) of items");
    }

    // 2. LOGICAL CHECKS: Category Existence & Ownership
    const category = await getCategoryById(categoryId, branchId);
    if (!category) throw new Error("Category not found in this branch");

    // 3. LOGICAL CHECKS: Duplicates
    const existing = await getMenuItemByNameInCategory(name, categoryId, branchId);
    if (existing) throw new Error(`Item '${name}' already exists in this category`);

    const now = Date.now();
    const menuItemId = crypto.randomUUID();
    const recipeId = crypto.randomUUID();

    await runInTransaction(async () =>
    {
        // Create Item
        await insertMenuItem({
            id: menuItemId,
            categoryId,
            name: name.trim(),
            price,
            prepTime,
            available: true,
            createdAt: now,
            updatedAt: now
        });

        // Create Recipe
        await insertRecipe({
            id: recipeId,
            menuItemId,
            instructions: recipeInstructions,
            createdAt: now,
            updatedAt: now
        });

        // Create Ingredients (We already validated it is an array or undefined)
        if (ingredients && ingredients.length > 0)
        {
            for (const ing of ingredients)
            {
                // Ensure ingredient structure is correct
                if (!ing.ingredient || !ing.quantity)
                {
                    throw new Error("Each ingredient must have 'ingredient' name and 'quantity'");
                }

                await insertIngredient({
                    id: crypto.randomUUID(),
                    recipeId,
                    ingredient: ing.ingredient,
                    quantity: ing.quantity
                });
            }
        }
    });

    await logMenuEvent({
        id: crypto.randomUUID(),
        entityType: "ITEM",
        entityId: menuItemId,
        type: "CREATED",
        newValue: JSON.stringify({ name, price, categoryName: category.name }),
        actorId,
        createdAt: now
    });

    return { menuItemId, recipeId };
}

/* ============================================================
   CREATE (Multi-Branch Batch)
============================================================ */
export async function createMenuItemForBranches({ categoryName, name, price, prepTime, recipeInstructions, ingredients, targetBranchIds, actorId })
{
    await assertStaffRole(actorId, [STAFF_ROLE.OWNER]);
    // FAIL FAST
    if (!targetBranchIds || !Array.isArray(targetBranchIds) || targetBranchIds.length === 0) throw new Error("Target branches required (Array)");
    if (!name) throw new Error("Item name is required");
    if (!recipeInstructions) throw new Error("Recipe instructions are required");

    // STRICT INGREDIENT CHECK
    if (ingredients !== undefined && !Array.isArray(ingredients))
    {
        throw new Error("Ingredients must be a list (array) of items");
    }

    const now = Date.now();

    // 1. Find Destination Categories
    const categories = await findCategoryIdsByName(categoryName, targetBranchIds);

    if (categories.length === 0)
    {
        return { ok: false, message: `Category '${categoryName}' not found in any selected branch.` };
    }

    const itemsToInsert = [];
    const recipesToInsert = [];
    const ingredientsToInsert = [];
    const eventsToLog = [];

    // 2. Prepare Data
    for (const cat of categories)
    {
        // Check duplicate in this specific branch
        const existing = await getMenuItemByNameInCategory(name, cat.id, cat.branch_id);
        if (existing) continue;

        const newItemId = crypto.randomUUID();
        const newRecipeId = crypto.randomUUID();

        // Item
        itemsToInsert.push({
            id: newItemId,
            categoryId: cat.id,
            name,
            price,
            prepTime,
            available: true,
            createdAt: now,
            updatedAt: now
        });

        // Recipe
        recipesToInsert.push({
            id: newRecipeId,
            menuItemId: newItemId,
            instructions: recipeInstructions,
            createdAt: now,
            updatedAt: now
        });

        // Ingredients
        if (ingredients && ingredients.length > 0)
        {
            for (const ing of ingredients)
            {
                if (!ing.ingredient || !ing.quantity) throw new Error("Invalid ingredient structure");

                ingredientsToInsert.push({
                    id: crypto.randomUUID(),
                    recipeId: newRecipeId,
                    ingredient: ing.ingredient,
                    quantity: ing.quantity,
                    updatedAt: now
                });
            }
        }

        eventsToLog.push({
            id: crypto.randomUUID(),
            entityType: "ITEM",
            entityId: newItemId,
            type: "CREATED_MULTI_BRANCH",
            newValue: JSON.stringify({ name, branchId: cat.branch_id }),
            actorId,
            createdAt: now
        });
    }

    // 3. Execute Transaction
    await runInTransaction(async () =>
    {
        if (itemsToInsert.length > 0) await insertMenuItemsBatch(itemsToInsert);

        // Loop inserts for recipe/ingredients (safe fallback)
        for (const r of recipesToInsert) await insertRecipe(r);
        for (const i of ingredientsToInsert) await insertIngredient(i);

        for (const e of eventsToLog) await logMenuEvent(e);
    });

    return {
        ok: true,
        createdCount: itemsToInsert.length,
        message: `Created item '${name}' in ${itemsToInsert.length} branches. Skipped ${targetBranchIds.length - categories.length} missing categories.`
    };
}

/* ============================================================
   READ
============================================================ */

export async function listMenuItems({ branchId })
{
    //if (!branchId) throw new Error("Branch ID is required");
    return listMenuItemsRepo(branchId, false);
}

export async function listPublicMenuItems({ branchId })
{
    //if (!branchId) throw new Error("Branch ID is required");
    return listMenuItemsRepo(branchId, true);
}

export async function getMenuItem({ itemId, branchId })
{
    return getItemOrThrow(itemId, branchId);
}

/* ============================================================
   UPDATE (Single)
============================================================ */

export async function updateMenuItemDetails({ itemId, branchId, updates, actorId })
{
    await assertStaffRole(actorId, [STAFF_ROLE.OWNER, STAFF_ROLE.MANAGER]);

    const item = await getItemOrThrow(itemId, branchId);

    const dbUpdates = {};
    const changesLog = {};
    const oldValuesLog = {};

    // 1. NAME UPDATE (With Optimization & Unique Check)
    if (updates.name && typeof updates.name === 'string')
    {
        const newName = updates.name.trim();

        // OPTIMIZATION: Only check DB if name actually CHANGED
        if (newName !== item.name)
        {
            const existing = await getMenuItemByNameInCategory(newName, item.categoryId, branchId);
            if (existing) throw new Error(`Item '${newName}' already exists in this category`);

            dbUpdates.name = newName;
            changesLog.name = newName;
            oldValuesLog.name = item.name;
        }
    }

    // 2. PRICE UPDATE
    if (updates.price !== undefined)
    {
        if (updates.price <= 0) throw new Error("Price must be greater than 0");
        if (updates.price !== item.price)
        {
            dbUpdates.price = updates.price;
            changesLog.price = updates.price;
            oldValuesLog.price = item.price;
        }
    }

    // 3. PREP TIME
    if (updates.prepTime !== undefined && updates.prepTime !== item.prepTime)
    {
        dbUpdates.prepTime = updates.prepTime;
        changesLog.prepTime = updates.prepTime;
    }

    // 4. AVAILABILITY
    if (updates.available !== undefined && updates.available !== item.available)
    {
        dbUpdates.available = updates.available;
        changesLog.available = updates.available;
    }

    // 5. CATEGORY MOVE
    if (updates.categoryId && updates.categoryId !== item.categoryId)
    {
        // Strict: Check new category belongs to SAME branch
        const newCat = await getCategoryById(updates.categoryId, branchId);
        if (!newCat) throw new Error("Target category not found in this branch");

        dbUpdates.categoryId = updates.categoryId;
        changesLog.categoryId = updates.categoryId;
        oldValuesLog.categoryId = item.categoryId;
    }

    if (Object.keys(dbUpdates).length === 0) return item;

    await updateMenuItemRepo(itemId, dbUpdates);

    await logMenuEvent({
        id: crypto.randomUUID(),
        entityType: "ITEM",
        entityId: itemId,
        type: "UPDATED",
        oldValue: JSON.stringify(oldValuesLog),
        newValue: JSON.stringify(changesLog),
        actorId,
        createdAt: Date.now()
    });

    return { ...item, ...dbUpdates };
}

/* ============================================================
   UPDATE (Batch & Smart Move)
============================================================ */

export async function updateMenuItemForBranches({ name, updates, targetBranchIds, actorId })
{
    await assertStaffRole(actorId, [STAFF_ROLE.OWNER]);

    if (!targetBranchIds || !Array.isArray(targetBranchIds) || targetBranchIds.length === 0)
    {
        throw new Error("Target branch IDs required (Array)");
    }
    if (!name) throw new Error("Item name is required to identify items");
    // Find items
    const targetItems = await findItemsByNameInBranches(name, targetBranchIds);
    const targetItemIds = targetItems.map(t => t.id);

    if (targetItemIds.length === 0)
    {
        return { ok: true, message: "No matching items found in selected branches." };
    }

    const affectedCount = await updateMenuItemsBatch({
        itemIds: targetItemIds,
        updates
    });
    await logMenuEvent({
        id: crypto.randomUUID(),
        entityType: "ITEM",
        entityId: "BATCH_OPERATION",
        type: "BATCH_UPDATED",
        oldValue: name,
        newValue: JSON.stringify({ updates, count: affectedCount }),
        actorId,
        createdAt: Date.now()
    });

    return { ok: true, message: `Updated '${name}' in ${affectedCount} locations.` };
}

export async function moveMenuItemForBranches({ name, targetCategoryName, targetBranchIds, actorId })
{
    await assertStaffRole(actorId, [STAFF_ROLE.OWNER]);

    if (!targetBranchIds || !Array.isArray(targetBranchIds) || targetBranchIds.length === 0)
    {
        throw new Error("Target branch IDs required (Array)");
    }

    // 1. Find Data
    const items = await findItemIdsByName(name, targetBranchIds);
    const categories = await findCategoryIdsByName(targetCategoryName, targetBranchIds);

    const moves = [];
    const missingInBranches = [];

    // We track which branches were actually updated for logging purposes
    const affectedBranchIds = new Set();

    // 2. Calculate Moves
    for (const item of items)
    {
        const matchingCat = categories.find(c => c.branch_id === item.branch_id);

        if (matchingCat)
        {
            moves.push({ itemId: item.item_id, categoryId: matchingCat.id });
            affectedBranchIds.add(item.branch_id);
        } else
        {
            missingInBranches.push(item.branch_id);
        }
    }

    if (moves.length === 0) return { ok: true, message: "No moves possible (Items or Categories missing)." };

    // 3. Execute Batch Update
    await updateItemCategoriesBatch(moves);

    // 4. Log Events (PER BRANCH)
    // 🛑 FIX: Loop through affected branches so each one gets a specific syncable event.
    for (const bId of affectedBranchIds)
    {
        await logMenuEvent({
            id: crypto.randomUUID(),
            branchId: bId, // ✅ CRITICAL: Now the cloud knows where this happened
            entityType: "ITEM",
            entityId: "BATCH_OPERATION",
            type: "BATCH_MOVED",
            oldValue: name,
            newValue: `Moved to '${targetCategoryName}'`,
            actorId,
            createdAt: Date.now()
        });
    }

    return {
        ok: true,
        message: `Moved '${name}' in ${moves.length} branches. Skipped ${missingInBranches.length} missing categories.`
    };
}

/* ============================================================
   DELETE (Single & Batch)
============================================================ */

/* ============================================================
   DELETE (Single & Batch) - With Recipe/Ingredient Cleanup
============================================================ */

export async function deleteMenuItem({ itemId, branchId, actorId })
{
    await assertStaffRole(actorId, [STAFF_ROLE.OWNER, STAFF_ROLE.MANAGER]);

    const item = await getItemOrThrow(itemId, branchId);

    // 1. Fetch Recipe (to get ID for ingredient deletion)
    const recipe = await getRecipeByMenuItemId(itemId, branchId);

    await runInTransaction(async () =>
    {
        // 2. Delete Ingredients & Recipe (if they exist)
        if (recipe)
        {
            await deleteAllIngredientsForRecipe(recipe.id);
            await deleteRecipeRepo(recipe.id);
        }

        // 3. Delete the Item
        await deleteMenuItemRepo(itemId);

        // 4. Log Event
        await logMenuEvent({
            id: crypto.randomUUID(),
            branchId, // Ensure branchId is logged if available
            entityType: "ITEM",
            entityId: itemId,
            type: "DELETED",
            oldValue: item.name,
            newValue: "DELETED",
            actorId,
            createdAt: Date.now()
        });
    });

    return { ok: true };
}

export async function deleteMenuItemForBranches({ name, targetBranchIds, actorId })
{
    await assertStaffRole(actorId, [STAFF_ROLE.OWNER]);

    if (!targetBranchIds || !Array.isArray(targetBranchIds) || targetBranchIds.length === 0)
    {
        throw new Error("Target branch IDs required (Array)");
    }

    // 1. Find Items
    const targetItems = await findItemsByNameInBranches(name, targetBranchIds);
    const targetItemIds = targetItems.map(t => t.id);

    if (targetItemIds.length === 0) return { ok: true, message: "No items found." };

    // 2. Find Associated Recipes (to delete ingredients)
    const targetRecipes = await findRecipeIdsByItemName(name, targetBranchIds);
    const targetRecipeIds = targetRecipes.map(r => r.id);

    let deletedCount = 0;

    await runInTransaction(async () =>
    {
        // A. Delete Ingredients (The "Nuclear" Option)
        if (targetRecipeIds.length > 0)
        {
            await deleteAllIngredientsForRecipes(targetRecipeIds);
        }

        // B. Delete Recipes
        // We can delete by item IDs to be safe/efficient
        if (targetItemIds.length > 0)
        {
            await deleteRecipesByItemIds(targetItemIds);
        }

        // C. Delete Items
        deletedCount = await deleteMenuItemsBatch(targetItemIds);
    });

    // 3. Log Event
    await logMenuEvent({
        id: crypto.randomUUID(),
        entityType: "ITEM",
        entityId: "BATCH_OPERATION",
        type: "BATCH_DELETED",
        oldValue: name,
        newValue: JSON.stringify({ count: deletedCount, recipeCount: targetRecipeIds.length }),
        actorId,
        createdAt: Date.now()
    });

    return { ok: true, message: `Deleted '${name}' (and associated recipes) from ${deletedCount} locations.` };
}