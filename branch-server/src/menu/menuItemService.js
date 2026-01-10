import { ensureCategoryExists } from "./menuCategoryService.js";
import crypto from "crypto";
import { getMenuItemByNameInCategory, insertMenuItem, updateMenuAvailability, updateMenuItemPrice } from "./menuItemRepository.js";
import { assertStaffRole } from "../staff/staffService.js";
import { STAFF_ROLE } from "../staff/staffRoles.js";
import { logMenuEvent } from "./menuEventRepository.js";
import { insertIngredient } from "./recipeIngredientRepository.js";
import { insertRecipe } from "./recipeRepository.js";
import { runInTransaction } from "../infra/transactionManager.js";
import { listEnabledMenuItems, listAllMenuItems, updateMenuItemCategory, getMenuItemByIdRepo, updateMenuItemRepo } from "./menuItemRepository.js";


export function createMenuItemWithRecipe({ categoryId, name, price, prepTime, recipeInstructions, ingredients, actorId })
{
    assertStaffRole(actorId, [STAFF_ROLE.MANAGER, STAFF_ROLE.OWNER]);

    if (!recipeInstructions || recipeInstructions.trim() === "")
    {
        throw new Error("Recipe instructions are required");
    }
    if (!Array.isArray(ingredients))
    {
        throw new Error("Ingredients must be an array");
    }

    if (!name || price <= 0)
    {
        throw new Error("Invalid menu item data");
    }
    ensureCategoryExists(categoryId);
    const existing = getMenuItemByNameInCategory(name, categoryId);
    if (existing)
    {
        throw new Error(`Menu item '${name}' already exists in this category`);
    }

    const now = Date.now();
    const menuItemId = crypto.randomUUID();
    const recipeId = crypto.randomUUID();

    runInTransaction(() =>
    {
        insertMenuItem({
            id: menuItemId,
            categoryId,
            name,
            price,
            prepTime,
            available: true,
            createdAt: now,
            updatedAt: now,
        });

        insertRecipe({
            id: recipeId,
            menuItemId,
            instructions: recipeInstructions,
            createdAt: now,
            updatedAt: now,
        });

        for (const ing of ingredients)
        {
            insertIngredient({
                id: crypto.randomUUID(),
                recipeId,
                ingredient: ing.ingredient,
                quantity: ing.quantity,
            });
        }
    });

    logMenuEvent({
        id: crypto.randomUUID(),
        entityType: "ITEM",
        entityId: menuItemId,
        type: "CREATED_WITH_RECIPE",
        oldValue: null,
        newValue: name,
        actorId,
        createdAt: now,
    });

    return { menuItemId, recipeId };
}

export function setMenuItemAvailability({ itemId, available, actorId })
{
    assertStaffRole(actorId, [STAFF_ROLE.MANAGER, STAFF_ROLE.OWNER]);

    const item = getMenuItemByIdRepo(itemId);
    if (!item)
    {
        throw new Error("Menu item not found");
    }

    const previous = item.available;

    if (previous === available)
    {
        return; // idempotent
    }

    updateMenuAvailability(itemId, available);

    logMenuEvent({
        id: crypto.randomUUID(),
        entityType: "ITEM",
        entityId: itemId,
        type: available ? "ACTIVATED" : "DEACTIVATED",
        oldValue: previous ? "AVAILABLE" : "UNAVAILABLE",
        newValue: available ? "AVAILABLE" : "UNAVAILABLE",
        actorId,
        createdAt: Date.now(),
    });
}

export function changeMenuItemPrice({ itemId, newPrice, actorId })
{
    assertStaffRole(actorId, [STAFF_ROLE.OWNER, STAFF_ROLE.MANAGER]);

    const item = getMenuItemByIdRepo(itemId);
    if (!item) throw new Error("Menu item not found");

    if (newPrice <= 0)
    {
        throw new Error("Price must be greater than 0.");
    }

    if (item.price === newPrice)
    {
        return; // idempotent, no-op
    }

    updateMenuItemPrice(itemId, newPrice);

    logMenuEvent({
        id: crypto.randomUUID(),
        entityType: "ITEM",
        entityId: itemId,
        type: "PRICE_CHANGED",
        oldValue: String(item.price),
        newValue: String(newPrice),
        actorId,
        createdAt: Date.now(),
    });
}

export function ensureItemExists(itemId)
{
    const item = getMenuItemById(itemId);
    if (!item || item.available === 0)
    {
        throw new Error("Item is not active or does not exist");
    }
}

export function updateMenuItem({ itemId, name, prepTime, actorId })
{
    assertStaffRole(actorId, [STAFF_ROLE.OWNER, STAFF_ROLE.MANAGER]);

    const item = getMenuItemByIdRepo(itemId);
    if (!item) throw new Error("Menu item not found");

    let nameToUpdate = item.name;
    let prepTimeToUpdate = item.prep_time;

    // 🧠 Name handling
    if (typeof name === "string" && name.trim() !== "")
    {
        const trimmed = name.trim();

        // uniqueness check ONLY if name actually changes
        if (trimmed !== item.name)
        {
            const existing = getMenuItemByNameInCategory(trimmed, item.category_id);
            if (existing)
            {
                throw new Error(
                    `Menu item '${trimmed}' already exists in this category`
                );
            }
        }

        nameToUpdate = trimmed;
    } else
    {
        nameToUpdate = item.name;
    }

    // 🧠 Prep time handling
    if (prepTime !== undefined && prepTime !== "" && Number.isInteger(prepTime) && prepTime > 0)
    {
        prepTimeToUpdate = prepTime;
    }
    else
    {
        prepTimeToUpdate = item.prep_time;
    }

    updateMenuItemRepo({
        itemId,
        name: nameToUpdate,
        prepTime: prepTimeToUpdate,
    });
}

export function moveMenuItem({ itemId, categoryId, actorId })
{
    assertStaffRole(actorId, [STAFF_ROLE.OWNER, STAFF_ROLE.MANAGER]);

    const item = getMenuItemByIdRepo(itemId);
    if (!item) throw new Error("Menu item not found");

    updateMenuItemCategory(itemId, categoryId);
}

export function listMenuItems({ actorId })
{
    assertStaffRole(actorId, [STAFF_ROLE.OWNER, STAFF_ROLE.MANAGER]);
    return listAllMenuItems();
}

export function listPublicMenuItems()
{
    return listEnabledMenuItems();
}

export function getMenuItemById(itemId)
{
    return getMenuItemByIdRepo(itemId);
}

