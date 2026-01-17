import crypto from "crypto";
import
    {
        insertCategory,
        getCategoryById,
        getCategoryByName,
        findCategoryIdsByName,
        updateCategoryRepo,
        listCategoriesRepo,
        countItemsInCategory,
        deleteCategoryRepo,
        insertCategoriesBatch,
        updateCategoriesBatch,
        deleteCategoriesBatch,
        checkItemsExistInCategoryName
    } from "./menuCategoryRepository.js";
import { STAFF_ROLE, assertStaffRole } from "../staff/staffRoles.js";
import { assertBranchExists } from "../infra/branchService.js";
import { logMenuEvent } from "./menuEventRepository.js";
import { runInTransaction } from "../infra/transactionManager.js";

/* ============================================================
   PRIVATE HELPER
============================================================ */
async function getCategoryOrThrow(categoryId, branchId)
{
    const category = await getCategoryById(categoryId, branchId);
    if (!category)
    {
        throw new Error("Category not found in this branch");
    }
    return category;
}

/* ============================================================
   CREATE
============================================================ */

export async function createCategory({ name, sortOrder, actorId, branchId })
{
    if (!branchId) throw new Error("Branch ID is required");
    await assertBranchExists(branchId);

    // Auth: Manager/Owner only
    await assertStaffRole(actorId, [STAFF_ROLE.MANAGER, STAFF_ROLE.OWNER]);

    if (!name) throw new Error("Category name is required");

    // Check duplicate name within THIS branch
    const existing = await getCategoryByName(name, branchId);
    if (existing)
    {
        throw new Error(`Category '${name}' already exists in this branch`);
    }

    const now = Date.now();
    const category = {
        id: crypto.randomUUID(),
        name,
        sortOrder: sortOrder ?? 0,
        available: true,
        branchId,
        createdAt: now,
        updatedAt: now,
    };

    await insertCategory(category);

    await logMenuEvent({
        id: crypto.randomUUID(),
        branchId, // 👈 ADD THIS
        entityType: "CATEGORY",
        entityId: category.id,
        type: "CREATED",
        oldValue: null,
        newValue: JSON.stringify({ name: category.name, sortOrder: category.sortOrder }),
        actorId,
        createdAt: now,
    });

    return category;
}

export async function createCategoryForBranches({ name, sortOrder, targetBranchIds, actorId })
{
    await assertStaffRole(actorId, [STAFF_ROLE.OWNER]);

    if (!targetBranchIds || targetBranchIds.length === 0)
    {
        throw new Error("Target branch IDs are required");
    }

    // 1. VALIDATION CHECK
    const existingCategories = await findCategoryIdsByName(name, targetBranchIds);

    if (existingCategories.length !== 0)
    {
        throw new Error(`Category '${name}' already exists in one or more selected branches.`);
    }

    const now = Date.now();
    const categoriesToInsert = [];
    const eventsToLog = [];

    // 2. Prepare Data
    for (const bId of targetBranchIds)
    {
        const newId = crypto.randomUUID();

        categoriesToInsert.push({
            id: newId,
            name,
            sortOrder: sortOrder ?? 0,
            available: true,
            branchId: bId,
            createdAt: now,
            updatedAt: now,
        });

        eventsToLog.push({
            id: crypto.randomUUID(),
            branchId: bId, // 👈 ADD THIS (Critical for Batch Sync)
            entityType: "CATEGORY",
            entityId: newId,
            type: "CREATED_MULTI_BRANCH",
            oldValue: null,
            newValue: JSON.stringify({ name }),
            actorId,
            createdAt: now
        });
    }

    // 3. Transaction
    await runInTransaction(async () =>
    {
        await insertCategoriesBatch(categoriesToInsert);
        for (const event of eventsToLog)
        {
            await logMenuEvent(event);
        }
    });

    return {
        ok: true,
        createdCount: categoriesToInsert.length,
        message: `Successfully created category '${name}' in ${categoriesToInsert.length} branches.`
    };
}

/* ============================================================
   READ
============================================================ */

export async function listCategories({ branchId })
{
    if (!branchId) throw new Error("Branch ID is required");
    return listCategoriesRepo(branchId, false);
}

export async function listPublicCategories({ branchId })
{
    if (!branchId) throw new Error("Branch ID is required");
    return listCategoriesRepo(branchId, true);
}

export async function getCategory({ categoryId, branchId })
{
    return getCategoryOrThrow(categoryId, branchId);
}

/* ============================================================
   UPDATE (Single & Batch)
============================================================ */

export async function updateCategoryDetails({ categoryId, name, sortOrder, actorId, branchId })
{
    await assertStaffRole(actorId, [STAFF_ROLE.OWNER, STAFF_ROLE.MANAGER]);

    const category = await getCategoryOrThrow(categoryId, branchId);

    const changes = {};
    const oldValues = {};

    if (name && name !== category.name)
    {
        changes.name = name;
        oldValues.name = category.name;
    }
    if (sortOrder !== undefined && sortOrder !== category.sortOrder)
    {
        changes.sortOrder = sortOrder;
        oldValues.sortOrder = category.sortOrder;
    }

    if (Object.keys(changes).length === 0) return category;

    await updateCategoryRepo(categoryId, branchId, changes);

    await logMenuEvent({
        id: crypto.randomUUID(),
        branchId, // 👈 ADD THIS
        entityType: "CATEGORY",
        entityId: categoryId,
        type: "DETAILS_UPDATED",
        oldValue: JSON.stringify(oldValues),
        newValue: JSON.stringify(changes),
        actorId,
        createdAt: Date.now(),
    });

    return { ...category, ...changes };
}

export async function updateCategoryForBranches({ name, updates, targetBranchIds, actorId })
{
    await assertStaffRole(actorId, [STAFF_ROLE.OWNER]);

    if (!targetBranchIds || targetBranchIds.length === 0)
    {
        throw new Error("Target branch IDs are required");
    }

    // 1. VALIDATION: Find which branches actually have this category
    const existingCategories = await findCategoryIdsByName(name, targetBranchIds);

    if (existingCategories.length === 0)
    {
        throw new Error(`Category '${name}' does not exist in any of the selected branches.`);
    }

    if (existingCategories.length < targetBranchIds.length)
    {
        console.warn(`Warning: Category '${name}' only found in ${existingCategories.length}/${targetBranchIds.length} branches.`);
    }

    // 2. Perform Update
    const affectedRows = await updateCategoriesBatch({
        targetBranchIds,
        name,
        updates
    });

    // 3. Log per Branch (Better for Sync)
    // We iterate over 'existingCategories' because those are the specific branches that got updated
    for (const cat of existingCategories)
    {
        await logMenuEvent({
            id: crypto.randomUUID(),
            branchId: cat.branch_id, // 👈 ADD THIS: Log specifically for this branch
            entityType: "CATEGORY",
            entityId: cat.id,
            type: "BATCH_UPDATED",
            oldValue: name,
            newValue: JSON.stringify(updates),
            actorId,
            createdAt: Date.now()
        });
    }

    return {
        ok: true,
        message: `Updated category '${name}' in ${affectedRows} branches.`
    };
}

export async function changeCategoryAvailability({ categoryId, available, actorId, branchId })
{
    await assertStaffRole(actorId, [STAFF_ROLE.MANAGER, STAFF_ROLE.OWNER]);

    const category = await getCategoryOrThrow(categoryId, branchId);

    if (category.available === available) return category;

    await updateCategoryRepo(categoryId, branchId, { available });

    await logMenuEvent({
        id: crypto.randomUUID(),
        branchId, // 👈 ADD THIS
        entityType: "CATEGORY",
        entityId: categoryId,
        type: available ? "ACTIVATED" : "DEACTIVATED",
        oldValue: category.available ? "AVAILABLE" : "UNAVAILABLE",
        newValue: available ? "AVAILABLE" : "UNAVAILABLE",
        actorId,
        createdAt: Date.now(),
    });

    return { ...category, available };
}

/* ============================================================
   DELETE (Single & Batch)
============================================================ */

export async function deleteCategory({ categoryId, actorId, branchId })
{
    await assertStaffRole(actorId, [STAFF_ROLE.OWNER, STAFF_ROLE.MANAGER]);

    const category = await getCategoryOrThrow(categoryId, branchId);

    const itemsCount = await countItemsInCategory(categoryId, branchId);
    if (itemsCount > 0)
    {
        throw new Error(`Cannot delete category '${category.name}' because it contains ${itemsCount} items.`);
    }

    await deleteCategoryRepo(categoryId, branchId);

    await logMenuEvent({
        id: crypto.randomUUID(),
        branchId, // 👈 ADD THIS
        entityType: "CATEGORY",
        entityId: categoryId,
        type: "DELETED",
        oldValue: category.name,
        newValue: "DELETED",
        actorId,
        createdAt: Date.now(),
    });

    return { ok: true };
}

export async function deleteCategoryForBranches({ name, targetBranchIds, actorId })
{
    await assertStaffRole(actorId, [STAFF_ROLE.OWNER]);

    // 1. Safety Check
    const hasItems = await checkItemsExistInCategoryName({ targetBranchIds, name });
    if (hasItems)
    {
        throw new Error(`Cannot delete category '${name}' because it contains items in one or more selected branches. Remove items first.`);
    }

    // 2. Find branches containing the category
    const existingCategories = await findCategoryIdsByName(name, targetBranchIds);

    if (existingCategories.length === 0)
    {
        throw new Error(`Category '${name}' does not exist in any of the selected branches.`);
    }

    // 3. Delete
    const deletedCount = await deleteCategoriesBatch({ targetBranchIds, name });

    // 4. Log per Branch
    for (const cat of existingCategories)
    {
        await logMenuEvent({
            id: crypto.randomUUID(),
            branchId: cat.branch_id, // 👈 ADD THIS
            entityType: "CATEGORY",
            entityId: cat.id,
            type: "BATCH_DELETED",
            oldValue: name,
            newValue: "DELETED",
            actorId,
            createdAt: Date.now()
        });
    }

    return {
        ok: true,
        message: `Deleted category '${name}' from ${deletedCount} branches.`
    };
}