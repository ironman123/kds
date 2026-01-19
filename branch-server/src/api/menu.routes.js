import express from "express";
import
{
    createCategory,
    listCategories,
    listPublicCategories,
    updateCategoryDetails,
    changeCategoryAvailability,
    deleteCategory,
    createCategoryForBranches,
    updateCategoryForBranches,
    deleteCategoryForBranches
} from "../menu/menuCategoryService.js";
import
{
    createMenuItem,
    listMenuItems,
    listPublicMenuItems,
    updateMenuItemDetails,
    deleteMenuItem,
    createMenuItemForBranches,
    updateMenuItemForBranches,
    deleteMenuItemForBranches,
    moveMenuItemForBranches
} from "../menu/menuItemService.js";
import
{
    getRecipeDetails,
    editRecipe,
    updateRecipeForBranches
} from "../menu/recipeService.js";
import { assertRequired } from "../utils/validators.js";
import { requireAuth } from "../auth/authMiddleware.js"; // Your Auth Middleware

const router = express.Router();

// Apply Auth globally to all menu routes
router.use(requireAuth);

/* ============================================================
   SECTION 1: CATEGORIES
============================================================ */
// --- Batch Operations (Owner Only) ---
router.post("/categories/batch", async (req, res) =>
{
    try
    {
        const { actorId, role } = req.context;
        assertRequired(req.body, ['name', 'targetBranchIds']);

        // Service will throw error if actorId is not OWNER
        const result = await createCategoryForBranches({
            ...req.body,
            actorId: actorId
        });
        res.status(201).json(result);
    } catch (e) { res.status(400).json({ error: e.message }); }
});

router.patch("/categories/batch", async (req, res) =>
{
    const { actorId } = req.context;
    try
    {
        const result = await updateCategoryForBranches({
            ...req.body,
            actorId: actorId
        });
        res.json(result);
    } catch (e) { res.status(400).json({ error: e.message }); }
});

router.delete("/categories/batch", async (req, res) =>
{
    const { actorId } = req.context;
    try
    {
        const result = await deleteCategoryForBranches({
            ...req.body,
            actorId: actorId
        });
        res.json(result);
    } catch (e) { res.status(400).json({ error: e.message }); }
});

// --- Public / POS View (Available Only) ---
router.get("/categories/public", async (req, res) =>
{
    try
    {
        // branchId comes from header (via Middleware context)
        const result = await listPublicCategories({ branchId: req.context.branchId });
        res.json(result);
    } catch (e) { res.status(400).json({ error: e.message }); }
});

// --- Admin View (All Categories including hidden) ---
router.get("/categories", async (req, res) =>
{
    try
    {
        const { branchId, role } = req.context;

        // 🧠 THE FIX: 
        // If Owner, pass NULL to fetch all categories from all branches.
        // If Manager, pass their specific branchId.
        const targetBranchId = role === 'OWNER' ? null : branchId;


        const result = await listCategories({ branchId: targetBranchId });
        res.json(result);
    } catch (e) { res.status(400).json({ error: e.message }); }
});

// --- Single Operations (Manager/Owner) ---
router.post("/categories", async (req, res) =>
{
    try
    {
        const result = await createCategory({
            ...req.body,
            actorId: req.context.actorId,
            branchId: req.context.branchId
        });
        res.status(201).json(result);
    } catch (e) { res.status(400).json({ error: e.message }); }
});

router.patch("/categories/:id", async (req, res) =>
{
    try
    {
        const { actorId, role, branchId } = req.context;

        // 🧠 MODULAR FIX:
        // If Owner: Pass NULL (ignore branch check, find category by ID globally)
        // If Manager: Pass 'branchId' (ensure category belongs to their branch)
        const enforcementBranchId = role === 'OWNER' ? null : branchId;
        const result = await updateCategoryDetails({
            categoryId: req.params.id,
            ...req.body,
            actorId: actorId,
            branchId: enforcementBranchId
        });
        res.json(result);
    } catch (e) { res.status(400).json({ error: e.message }); }
});

router.patch("/categories/:id/availability", async (req, res) =>
{
    try
    {
        const { actorId, role, branchId } = req.context;

        // 🧠 MODULAR FIX
        const enforcementBranchId = role === 'OWNER' ? null : branchId;

        const result = await changeCategoryAvailability({
            categoryId: req.params.id,
            available: req.body.available,
            actorId,
            branchId: enforcementBranchId
        });
        res.json(result);
    } catch (e) { res.status(400).json({ error: e.message }); }
});

router.delete("/categories/:id", async (req, res) =>
{
    try
    {
        const { actorId, role, branchId } = req.context;

        // 🧠 MODULAR FIX
        const enforcementBranchId = role === 'OWNER' ? null : branchId;

        await deleteCategory({
            categoryId: req.params.id,
            actorId,
            branchId: enforcementBranchId
        });
        res.sendStatus(204);
    } catch (e) { res.status(400).json({ error: e.message }); }
});




/* ============================================================
   SECTION 2: MENU ITEMS
============================================================ */
// --- Batch Operations (Owner Only) ---
router.post("/items/batch", async (req, res) =>
{
    try
    {
        const result = await createMenuItemForBranches({
            ...req.body,
            actorId: req.context.actorId
        });
        res.status(201).json(result);
    } catch (e) { res.status(400).json({ error: e.message }); }
});

router.patch("/items/batch", async (req, res) =>
{
    try
    {
        const result = await updateMenuItemForBranches({
            ...req.body,
            actorId: req.context.actorId
        });
        res.json(result);
    } catch (e) { res.status(400).json({ error: e.message }); }
});

// Smart Move (Batch Move Categories)
router.post("/items/batch/move", async (req, res) =>
{
    try
    {
        const result = await moveMenuItemForBranches({
            ...req.body,
            actorId: req.context.actorId
        });
        res.json(result);
    } catch (e) { res.status(400).json({ error: e.message }); }
});

router.delete("/items/batch", async (req, res) =>
{
    try
    {
        const result = await deleteMenuItemForBranches({
            ...req.body,
            actorId: req.context.actorId
        });
        res.json(result);
    } catch (e) { res.status(400).json({ error: e.message }); }
});


// --- Public / POS View ---
router.get("/items/public", async (req, res) =>
{
    try
    {
        const result = await listPublicMenuItems({ branchId: req.context.branchId });
        res.json(result);
    } catch (e) { res.status(400).json({ error: e.message }); }
});

// --- Admin View ---
router.get("/items", async (req, res) =>
{
    try
    {
        const result = await listMenuItems({ branchId: req.context.branchId });
        res.json(result);
    } catch (e) { res.status(400).json({ error: e.message }); }
});

// --- Single Operations (Manager/Owner) ---
router.post("/items", async (req, res) =>
{
    try
    {
        const result = await createMenuItem({
            ...req.body,
            actorId: req.context.actorId,
            branchId: req.context.branchId
        });
        res.status(201).json(result);
    } catch (e) { res.status(400).json({ error: e.message }); }
});

router.patch("/items/:id", async (req, res) =>
{
    try
    {
        const result = await updateMenuItemDetails({
            itemId: req.params.id,
            updates: req.body,
            actorId: req.context.actorId,
            branchId: req.context.branchId
        });
        res.json(result);
    } catch (e) { res.status(400).json({ error: e.message }); }
});

router.delete("/items/:id", async (req, res) =>
{
    try
    {
        await deleteMenuItem({
            itemId: req.params.id,
            actorId: req.context.actorId,
            branchId: req.context.branchId
        });
        res.sendStatus(204);
    } catch (e) { res.status(400).json({ error: e.message }); }
});



/* ============================================================
   SECTION 3: RECIPES
============================================================ */

// --- Batch Operation (Owner Only) ---
// Used to standardize recipes across branches
router.put("/items/recipe/batch", async (req, res) =>
{
    try
    {
        const result = await updateRecipeForBranches({
            ...req.body,
            actorId: req.context.actorId
        });
        res.json(result);
    } catch (e) { res.status(400).json({ error: e.message }); }
});

// --- Get Recipe Details ---
router.get("/items/:itemId/recipe", async (req, res) =>
{
    try
    {
        const result = await getRecipeDetails({
            menuItemId: req.params.itemId,
            branchId: req.context.branchId
        });
        res.json(result);
    } catch (e) { res.status(400).json({ error: e.message }); }
});

// --- Single Operation (Edit Recipe) ---
router.put("/items/:itemId/recipe", async (req, res) =>
{
    try
    {
        // Handles Instructions + Ingredients (Add/Remove/Update/Replace)
        const result = await editRecipe({
            menuItemId: req.params.itemId,
            ...req.body,
            actorId: req.context.actorId,
            branchId: req.context.branchId
        });
        res.json(result);
    } catch (e) { res.status(400).json({ error: e.message }); }
});



export default router;