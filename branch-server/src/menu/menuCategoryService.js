import crypto from "crypto";
import { countItemsInCategory, deleteCategoryRepo, listAllCategories, listEnabledCategories, updateCategoryRepo, getCategoryByName, insertCategory, getCategoryById, updateCategoryActivity } from "./menuCategoryRepository.js";
import { assertStaffRole } from "../staff/staffService.js";
import { STAFF_ROLE } from "../staff/staffRoles.js";
import { logMenuEvent } from "./menuEventRepository.js";

export function createCategory({ name, sortOrder, actorId })
{
    assertStaffRole(actorId, [STAFF_ROLE.MANAGER, STAFF_ROLE.OWNER]);
    if (!name)
    {
        throw new Error("Category name is required");
    }
    const existing = getCategoryByName(name);
    if (existing)
    {
        throw new Error(`Category '${name}' already exists`);
    }


    const now = Date.now();

    const category = {
        id: crypto.randomUUID(),
        name,
        sortOrder: sortOrder ?? 0,
        available: 1,
        createdAt: now,
        updatedAt: now,
    };

    insertCategory(category);

    logMenuEvent({
        id: crypto.randomUUID(),
        entityType: "CATEGORY",
        entityId: category.id,
        type: "CREATED",
        oldValue: null,
        newValue: category.name,
        actorId,
        createdAt: Date.now(),
    });

    return category;
}

export function ensureCategoryExists(categoryId)
{
    const category = getCategoryById(categoryId);
    if (!category || category.available === 0)
    {
        throw new Error("Category is not active or does not exist");
    }
}

export function changeCategoryAvailability({ categoryId, available, actorId })
{
    assertStaffRole(actorId, [STAFF_ROLE.MANAGER, STAFF_ROLE.OWNER]);

    const category = getCategoryById(categoryId);
    if (!category)
    {
        throw new Error("Menu item not found");
    }

    const previous = category.available;

    console.log(category.name, ": ", previous, "->", available);

    if (previous === available)
    {
        return; // idempotent
    }

    updateCategoryActivity(categoryId, available);

    logMenuEvent({
        id: crypto.randomUUID(),
        entityType: "ITEM",
        entityId: categoryId,
        type: available ? "ACTIVATED" : "DEACTIVATED",
        oldValue: previous ? "AVAILABLE" : "UNAVAILABLE",
        newValue: available ? "AVAILABLE" : "UNAVAILABLE",
        actorId,
        createdAt: Date.now(),
    });
}

export function updateCategory({ categoryId, newName, newSortOrder, actorId })
{
    assertStaffRole(actorId, [STAFF_ROLE.OWNER, STAFF_ROLE.MANAGER]);

    const category = getCategoryById(categoryId);
    if (!category) throw new Error("Category not found");

    let nameToUpdate;
    let sortOrderToUpdate;

    // 🧠 Name handling
    if (typeof newName === "string" && newName.trim() !== "")
    {
        nameToUpdate = newName.trim();
    } else
    {
        nameToUpdate = category.name;
    }

    // 🧠 Sort order handling
    if (newSortOrder !== undefined && Number.isInteger(newSortOrder))
    {
        sortOrderToUpdate = newSortOrder;
    } else
    {
        sortOrderToUpdate = category.sort_order;
    }

    updateCategoryRepo({
        categoryId,
        newName: nameToUpdate,
        newSortOrder: sortOrderToUpdate,
    });
}



export function listCategories({ actorId })
{
    //assertStaffRole(actorId, [STAFF_ROLE.OWNER, STAFF_ROLE.MANAGER]);

    return listAllCategories();
}

/**
 * Public listing (POS / Customer / Menu display)
 */
export function listPublicCategories()
{
    return listEnabledCategories();
}

export function deleteCategory({ categoryId, actorId })
{
    assertStaffRole(actorId, [STAFF_ROLE.OWNER]);

    const usageCount = countItemsInCategory(categoryId);
    if (usageCount > 0)
    {
        throw new Error("Cannot delete category with items");
    }

    const deleted = deleteCategoryRepo(categoryId);
    if (deleted.changes === 0)
    {
        throw new Error("Category not found");
    }
}
