import express from "express";

import
{
    createCategory,
    changeCategoryAvailability,
    updateCategory,
    listCategories,
    listPublicCategories,
} from "../menu/menuCategoryService.js";

import
{
    createMenuItemWithRecipe,
    changeMenuItemPrice,
    setMenuItemAvailability,
    updateMenuItem,
    moveMenuItem,
    listMenuItems,
    listPublicMenuItems,
    getMenuItemById,
} from "../menu/menuItemService.js";

import
{
    getRecipeForMenuItem,
    addIngredient,
    changeIngredientQuantity,
    removeIngredient,
    editRecipe,
    listIngredientsForMenuItem
} from "../menu/recipeService.js";


const router = express.Router();

/* =======================
   CATEGORY ROUTES
======================= */

// Create category
router.post("/categories", (req, res) =>
{
    try
    {
        res.json(createCategory({
            name: req.body.name,
            sortOrder: req.body.sortOrder,
            actorId: req.body.actorId,
        }));
    } catch (e)
    {
        res.status(400).json({ error: e.message });
    }
});

// Update category metadata
router.patch("/categories/:id", (req, res) =>
{
    try
    {
        updateCategory({
            categoryId: req.params.id,
            newName: req.body.name,
            newSortOrder: req.body.sortOrder,
            actorId: req.body.actorId,
        });
        res.json({ ok: true });
    } catch (e)
    {
        res.status(400).json({ error: e.message });
    }
});

// Toggle category availability
router.post("/categories/:id/availability", (req, res) =>
{
    try
    {
        changeCategoryAvailability({
            categoryId: req.params.id,
            available: req.body.available,
            actorId: req.body.actorId,
        });
        res.json({ ok: true });
    } catch (e)
    {
        res.status(400).json({ error: e.message });
    }
});

// List categories (admin)
router.get("/categories", (req, res) =>
{
    try
    {
        res.json(listCategories({
            actorId: req.query.actorId
        }));
    } catch (e)
    {
        res.status(400).json({ error: e.message });
    }
});


// List categories (public)
router.get("/categories/public", (req, res) =>
{
    res.json(listPublicCategories());
});

/* =======================
   MENU ITEM ROUTES
======================= */

// Create item with recipe
router.post("/items", (req, res) =>
{
    try
    {
        res.json(createMenuItemWithRecipe({
            categoryId: req.body.categoryId,
            name: req.body.name,
            price: req.body.price,
            prepTime: req.body.prepTime,
            recipeInstructions: req.body.recipeInstructions,
            ingredients: req.body.ingredients,
            actorId: req.body.actorId,
        }));
        res.json({ ok: true });
    } catch (e)
    {
        res.status(400).json({ error: e.message });
    }
});

// Update menu item metadata
router.patch("/items/:id", (req, res) =>
{
    try
    {
        updateMenuItem({
            itemId: req.params.id,
            name: req.body.name,
            prepTime: req.body.prepTime,
            actorId: req.body.actorId,
        });
        res.json({ ok: true });
    } catch (e)
    {
        res.status(400).json({ error: e.message });
    }
});

// Update price
router.post("/items/:id/price", (req, res) =>
{
    try
    {
        changeMenuItemPrice({
            itemId: req.params.id,
            newPrice: req.body.price,
            actorId: req.body.actorId,
        });
        res.json({ ok: true });
    } catch (e)
    {
        res.status(400).json({ error: e.message });
    }
});

// Toggle item availability
router.post("/items/:id/availability", (req, res) =>
{
    try
    {
        setMenuItemAvailability({
            itemId: req.params.id,
            available: req.body.available,
            actorId: req.body.actorId,
        });
        res.json({ ok: true });
    } catch (e)
    {
        res.status(400).json({ error: e.message });
    }
});

// Move item to another category
router.post("/items/:id/move", (req, res) =>
{
    try
    {
        moveMenuItem({
            itemId: req.params.id,
            categoryId: req.body.categoryId,
            actorId: req.body.actorId,
        });
        res.json({ ok: true });
    } catch (e)
    {
        res.status(400).json({ error: e.message });
    }
});

// List items (admin)
router.get("/items", (req, res) =>
{
    res.json(listMenuItems({
        actorId: req.body.actorId
    }));
});

// List items (public)
router.get("/items/public", (req, res) =>
{
    res.json(listPublicMenuItems());
});

// Get single item (admin/debug)
router.get("/items/:id", (req, res) =>
{
    const item = getMenuItemById(req.params.id);
    if (!item) return res.status(404).json({ error: "Not found" });
    res.json(item);
});

/* =======================
   RECIPE & INGREDIENTS
======================= */

// Get recipe
router.get("/items/:id/recipe", (req, res) =>
{
    res.json(getRecipeForMenuItem(req.params.id));
});

router.get("/items/:id/ingredients", (req, res) =>
{
    res.json(listIngredientsForMenuItem(req.params.id));
});

// Add ingredient
router.post("/items/:id/ingredients", (req, res) =>
{
    try
    {
        addIngredient({
            menuItemId: req.params.id,
            ingredient: req.body.ingredient,
            quantity: req.body.quantity,
            actorId: req.body.actorId,
        });
        res.json({ ok: true });
    } catch (e)
    {
        res.status(400).json({ error: e.message });
    }
});

// Update ingredient quantity
router.patch("/ingredients/:ingredientId", (req, res) =>
{
    try
    {
        changeIngredientQuantity({
            ingredientId: req.params.ingredientId,
            menuItemId: req.body.menuItemId,
            newQuantity: req.body.newQuantity,
            actorId: req.body.actorId,
        });
        res.json({ ok: true });
    } catch (e)
    {
        res.status(400).json({ error: e.message });
    }
});

// Remove ingredient
router.delete("/ingredients/:ingredientId", (req, res) =>
{
    try
    {
        removeIngredient({
            ingredientId: req.params.ingredientId,
            menuItemId: req.body.menuItemId,
            actorId: req.body.actorId,
        });
        res.json({ ok: true });
    } catch (e)
    {
        res.status(400).json({ error: e.message });
    }
});

// Replace full recipe
router.patch("/items/:id/recipe", (req, res) =>
{
    try
    {
        editRecipe({
            menuItemId: req.params.id,
            instructions: req.body.instructions,
            addIngredients: req.body.addIngredients,
            updateIngredients: req.body.updateIngredients,
            removeIngredientIds: req.body.removeIngredientIds,
            replaceAllIngredients: req.body.replaceAllIngredients,
            actorId: req.body.actorId,
        });
        res.json({ ok: true });
    } catch (e)
    {
        res.status(400).json({ error: e.message });
    }
});

export default router;
