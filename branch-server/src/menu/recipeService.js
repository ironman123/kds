import crypto from "crypto";
import { getRecipeByMenuItemId, changeRecipeInstructions } from "./recipeRepository.js";
import { getIngredientById, deleteIngredientsForRecipe, deleteIngredient, insertIngredient, updateIngredientQuantity, getIngredientsForRecipe } from "./recipeIngredientRepository.js";
import { logMenuEvent } from "./menuEventRepository.js";
import { assertStaffRole } from "../staff/staffService.js";
import { STAFF_ROLE } from "../staff/staffRoles.js";
import { ensureItemExists } from "./menuItemService.js";

function assertRecipeExists(menuItemId)
{
    const recipe = getRecipeByMenuItemId(menuItemId);
    if (!recipe)
    {
        throw new Error("Recipe not found for menu item");
    }
    return recipe;
}


export function updateRecipeInstructions({ menuItemId, instructions, actorId })
{
    assertStaffRole(actorId, [STAFF_ROLE.MANAGER, STAFF_ROLE.OWNER]);
    ensureItemExists(menuItemId);

    const recipe = assertRecipeExists(menuItemId);

    changeRecipeInstructions(recipe.id, instructions);

    logMenuEvent({
        id: crypto.randomUUID(),
        entityType: "ITEM",
        entityId: menuItemId,
        type: "RECIPE_INSTRUCTIONS_UPDATED",
        oldValue: null,
        newValue: instructions,
        actorId,
        createdAt: Date.now(),
    });
}

export function addIngredient({ menuItemId, ingredient, quantity, actorId })
{
    assertStaffRole(actorId, [STAFF_ROLE.MANAGER, STAFF_ROLE.OWNER]);
    ensureItemExists(menuItemId);
    const recipe = assertRecipeExists(menuItemId);

    insertIngredient({
        id: crypto.randomUUID(),
        recipeId: recipe.id,
        ingredient,
        quantity,
    });

    logMenuEvent({
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

export function changeIngredientQuantity({ menuItemId, ingredientId, newQuantity, actorId })
{
    assertStaffRole(actorId, [STAFF_ROLE.MANAGER, STAFF_ROLE.OWNER]);
    console.log(menuItemId, ingredientId, newQuantity, actorId);

    console.log(ensureItemExists(menuItemId));
    const recipe = assertRecipeExists(menuItemId);


    const ingredient = getIngredientById(ingredientId);
    console.log(ingredient);
    console.log(recipe);
    if (!ingredient || ingredient.recipe_id !== recipe.id)
    {
        throw new Error("Ingredient does not belong to this recipe");
    }

    updateIngredientQuantity(ingredientId, newQuantity);

    logMenuEvent({
        id: crypto.randomUUID(),
        entityType: "ITEM",
        entityId: menuItemId, // still traceable
        type: "INGREDIENT_QUANTITY_UPDATED",
        oldValue: ingredient.quantity,
        newValue: newQuantity,
        actorId,
        createdAt: Date.now(),
    });
}

export function removeIngredient({ menuItemId, ingredientId, actorId })
{
    assertStaffRole(actorId, [STAFF_ROLE.MANAGER, STAFF_ROLE.OWNER]);
    ensureItemExists(menuItemId);
    const recipe = assertRecipeExists(menuItemId);

    const ingredient = getIngredientById(ingredientId);
    if (!ingredient || ingredient.recipe_id !== recipe.id)
    {
        throw new Error("Ingredient does not belong to this recipe");
    }

    deleteIngredient(ingredientId);

    logMenuEvent({
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

export function removeAllIngredients({ menuItemId, actorId })
{
    assertStaffRole(actorId, [STAFF_ROLE.MANAGER, STAFF_ROLE.OWNER]);
    ensureItemExists(menuItemId);
    const recipe = getRecipeOrThrow(menuItemId);

    deleteIngredientsForRecipe(recipe.id);

    logMenuEvent({
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

export function getRecipeForMenuItem(menuItemId)
{
    ensureItemExists(menuItemId);
    return getRecipeByMenuItemId(menuItemId);
}
export function listIngredientsForMenuItem(menuItemId)
{
    const recipe = getRecipeByMenuItemId(menuItemId);
    ensureItemExists(menuItemId);
    if (!recipe)
    {
        return []; // or throw, depending on your rule
    }

    return getIngredientsForRecipe(recipe.id);
}
export function editRecipe({
    menuItemId,
    instructions,
    addIngredients = [],
    updateIngredients = [],
    removeIngredientIds = [],
    replaceAllIngredients = null, // array OR null
    actorId,
})
{
    assertStaffRole(actorId, [STAFF_ROLE.MANAGER, STAFF_ROLE.OWNER]);
    ensureItemExists(menuItemId);

    if (!menuItemId)
    {
        throw new Error("menuItemId is required");
    }
    console.log(instructions);
    // 1️⃣ Update instructions (independent, optional)
    if (instructions !== undefined || instructions !== "")
    {
        updateRecipeInstructions({
            menuItemId,
            instructions,
            actorId
        });
    }

    // 2️⃣ Replace ALL ingredients (HIGHEST PRIORITY)
    if (Array.isArray(replaceAllIngredients))
    {
        removeAllIngredients({ menuItemId, actorId });

        for (const ing of replaceAllIngredients)
        {
            if (!ing.ingredient || !ing.quantity)
            {
                throw new Error("Invalid ingredient payload");
            }

            addIngredient({
                menuItemId,
                ingredient: ing.ingredient,
                quantity: ing.quantity,
                actorId
            });
        }

        return; // stop here by design
    }

    // Fetch existing ingredients ONCE for validation
    const existingIngredients = getIngredientsForRecipe(getRecipeByMenuItemId(menuItemId).id);
    //console.log("Existing: ", existingIngredients);

    const existingIds = new Set(existingIngredients.map(i => i.id));

    // 3️⃣ Remove ingredients
    for (const ingredientId of removeIngredientIds)
    {
        if (!existingIds.has(ingredientId))
        {
            throw new Error(`Ingredient ${ingredientId} does not belong to this recipe`);
        }

        removeIngredient({
            menuItemId,
            ingredientId,
            actorId
        });
    }

    // 4️⃣ Update ingredient quantities
    for (const upd of updateIngredients)
    {
        if (!existingIds.has(upd.ingredientId))
        {
            throw new Error(`Ingredient ${upd.ingredientId} does not belong to this recipe`);
        }

        if (!upd.quantity)
        {
            throw new Error("Quantity is required for update");
        }

        changeIngredientQuantity({
            menuItemId: menuItemId,
            ingredientId: upd.ingredientId,
            newQuantity: upd.quantity,
            actorId: actorId
        });
    }

    // 5️⃣ Add new ingredients
    for (const ing of addIngredients)
    {
        if (!ing.ingredient || !ing.quantity)
        {
            throw new Error("Invalid ingredient payload");
        }

        addIngredient({
            menuItemId,
            ingredient: ing.ingredient,
            quantity: ing.quantity,
            actorId: actorId
        });
    }
}