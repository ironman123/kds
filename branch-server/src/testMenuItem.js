import
{
    createMenuItemWithRecipe,
} from "./menu/menuItemService.js";

import
{
    addIngredient,
    changeIngredientQuantity,
    removeIngredient,
    removeAllIngredients,
    updateRecipeInstructions,
} from "./menu/recipeService.js";

import { getIngredientsForRecipe } from "./menu/recipeIngredientRepository.js";
import { getRecipeByMenuItemId } from "./menu/recipeRepository.js";
import { getMenuItemById } from "./menu/menuItemRepository.js";
import db from "./db.js";

import { getStaffById } from "./staff/staffRepository.js";

// ---- STAFF ----
const owner = getStaffById("5c54a7db-1075-4132-87c2-df24c4e5697a");
const manager = getStaffById("e89ee11f-ff7b-45f8-9125-15c80b760dad");
const waiter = getStaffById("b8297eed-c317-4dc4-ba4e-1f670e600132");

// ---- CATEGORIES (from your test) ----
const PIZZA_CAT = "e63c195a-74d8-4fce-8020-2f49bf2940d5";
const SIDES_CAT = "bd50b106-b107-4ee5-aac7-da26df39e74f";

// helper
function expectError(label, fn)
{
    try
    {
        fn();
        console.error(`❌ SHOULD HAVE FAILED: ${label}`);
    } catch (e)
    {
        console.log(`✅ Expected failure: ${label} → ${e.message}`);
    }
}

expectError("menu item without recipe", () =>
{
    createMenuItemWithRecipe({
        categoryId: "INVALID",
        name: "Invalid Pizza",
        price: 300,
        prepTime: 10,
        recipeInstructions: "",
        ingredients: [],
        actorId: owner.id,
    });
});


const pizza = createMenuItemWithRecipe({
    categoryId: PIZZA_CAT,
    name: "Margherita",
    price: 299,
    prepTime: 8,
    recipeInstructions: "Bake at high heat",
    ingredients: [
        { ingredient: "Dough", quantity: "1 base" },
        { ingredient: "Tomato Sauce", quantity: "100g" },
        { ingredient: "Mozzarella", quantity: "80g" },
    ],
    actorId: manager.id,
});

console.log("✅ Created pizza:", pizza.menuItemId);

const basilPizza = createMenuItemWithRecipe({
    categoryId: PIZZA_CAT,
    name: "Basil Pizza",
    price: 699,
    prepTime: 8,
    recipeInstructions: "Bake till roast",
    ingredients: [
        { ingredient: "Dough", quantity: "1 base" },
        { ingredient: "Tomato Sauce", quantity: "200g" },
        { ingredient: "Parmasan", quantity: "80g" },
        { ingredient: "Basil", quantity: "80g" },
    ],
    actorId: manager.id,
});

console.log("✅ Created Basil pizza:", basilPizza.menuItemId);


expectError("Duplicate menu item name", () =>
{
    createMenuItemWithRecipe({
        categoryId: PIZZA_CAT,
        name: "margherita",
        price: 320,
        prepTime: 8,
        recipeInstructions: "Same pizza",
        ingredients: [],
        actorId: owner.id,
    });
});

addIngredient({
    menuItemId: pizza.menuItemId,
    ingredient: "Basil",
    quantity: "5 leaves",
    actorId: manager.id,
});

console.log("✅ Added basil to normal pizza");

addIngredient({
    menuItemId: basilPizza.menuItemId,
    ingredient: "Basil",
    quantity: "25 leaves",
    actorId: manager.id,
});
console.log("✅ Added ton of basil to basil pizza");

const recipe = getRecipeByMenuItemId(pizza.menuItemId);
const ingredients = getIngredientsForRecipe(recipe.id);

const cheese = ingredients.find(i => i.ingredient === "Mozzarella");

changeIngredientQuantity({
    menuItemId: pizza.menuItemId,
    ingredientId: cheese.id,
    newQuantity: "256g",
    actorId: owner.id,
});

console.log("✅ Updated mozzarella quantity");


const side = createMenuItemWithRecipe({
    categoryId: SIDES_CAT,
    name: "Garlic Bread",
    price: 199,
    prepTime: 5,
    recipeInstructions: "Toast until crisp",
    ingredients: [
        { ingredient: "Bread", quantity: "2 slices" },
        { ingredient: "Butter", quantity: "30g" },
    ],
    actorId: manager.id,
});

const sideRecipe = getRecipeByMenuItemId(side.menuItemId);
const sideIngredient = getIngredientsForRecipe(sideRecipe.id)[0];

expectError("cross-recipe ingredient mutation", () =>
{
    changeIngredientQuantity({
        menuItemId: pizza.menuItemId,
        ingredientId: sideIngredient.id,
        newQuantity: "999g",
        actorId: owner.id,
    });
});

console.log(
    "MENU ITEMS:",
    db.prepare(`SELECT id, name FROM menu_items`).all()
);

console.log(
    "RECIPES:",
    db.prepare(`SELECT menu_item_id, instructions FROM recipes`).all()
);

console.log(
    "INGREDIENTS:",
    db.prepare(`SELECT recipe_id, ingredient, quantity FROM recipe_ingredients`).all()
);

console.log(
    "MENU EVENTS:",
    db.prepare(`
    SELECT entity_type, event_type, entity_id
    FROM menu_events
    ORDER BY created_at
  `).all()
);
