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
import { requireAuth } from "../auth/authMiddleware.js";
import { requirePermission } from '../auth/authorizationService.js';
import { PERMISSIONS } from '../auth/permissions.js';

const router = express.Router();

router.use(requireAuth);

/* ============================================================
   SECTION 1: CATEGORIES
============================================================ */

// --- BATCH (Explicit Routes for Frontend Compatibility) ---
router.post("/categories/batch", requirePermission(PERMISSIONS.MENU_MANAGE), async (req, res) =>
{
    try
    {
        const { actorId } = req.context;
        const result = await createCategoryForBranches({ ...req.body, actorId });
        res.status(201).json(result);
    } catch (e) { res.status(400).json({ error: e.message }); }
});

router.patch("/categories/batch", requirePermission(PERMISSIONS.MENU_MANAGE), async (req, res) =>
{
    try
    {
        const { actorId } = req.context;
        const result = await updateCategoryForBranches({ ...req.body, actorId });
        res.json(result);
    } catch (e) { res.status(400).json({ error: e.message }); }
});

router.delete("/categories/batch", requirePermission(PERMISSIONS.MENU_MANAGE), async (req, res) =>
{
    try
    {
        const { actorId } = req.context;
        const result = await deleteCategoryForBranches({ ...req.body, actorId });
        res.json(result);
    } catch (e) { res.status(400).json({ error: e.message }); }
});

// --- SINGLE & READ ---
router.get("/categories", requirePermission(PERMISSIONS.MENU_VIEW), async (req, res) =>
{
    try
    {
        const { branchId, role } = req.context;
        const targetBranchId = role === 'OWNER' ? null : branchId;
        const result = await listCategories({ branchId: targetBranchId });
        res.json(result);
    } catch (e) { res.status(400).json({ error: e.message }); }
});

router.get("/categories/public", async (req, res) =>
{
    try
    {
        const result = await listPublicCategories({ branchId: req.context.branchId });
        res.json(result);
    } catch (e) { res.status(400).json({ error: e.message }); }
});

router.post("/categories", requirePermission(PERMISSIONS.MENU_MANAGE), async (req, res) =>
{
    try
    {
        const { actorId, branchId, role } = req.context;
        // Owner passes branchId in body, Manager uses context
        const enforcementBranchId = role === 'OWNER' ? req.body.branchId : branchId;

        const result = await createCategory({ ...req.body, actorId, branchId: enforcementBranchId });
        res.status(201).json(result);
    } catch (e) { res.status(400).json({ error: e.message }); }
});

router.patch("/categories/:id", requirePermission(PERMISSIONS.MENU_MANAGE), async (req, res) =>
{
    try
    {
        const { actorId, branchId, role } = req.context;
        const enforcementBranchId = role === 'OWNER' ? null : branchId;

        const result = await updateCategoryDetails({ categoryId: req.params.id, ...req.body, actorId, branchId: enforcementBranchId });
        res.json(result);
    } catch (e) { res.status(400).json({ error: e.message }); }
});

router.patch("/categories/:id/availability", requirePermission(PERMISSIONS.MENU_MANAGE), async (req, res) =>
{
    try
    {
        const { actorId, branchId, role } = req.context;
        const enforcementBranchId = role === 'OWNER' ? null : branchId;

        const result = await changeCategoryAvailability({ categoryId: req.params.id, available: req.body.available, actorId, branchId: enforcementBranchId });
        res.json(result);
    } catch (e) { res.status(400).json({ error: e.message }); }
});

router.delete("/categories/:id", requirePermission(PERMISSIONS.MENU_MANAGE), async (req, res) =>
{
    try
    {
        const { actorId, branchId, role } = req.context;
        const enforcementBranchId = role === 'OWNER' ? null : branchId;

        await deleteCategory({ categoryId: req.params.id, actorId, branchId: enforcementBranchId });
        res.sendStatus(204);
    } catch (e) { res.status(400).json({ error: e.message }); }
});


/* ============================================================
   SECTION 2: MENU ITEMS
============================================================ */

// --- BATCH (Explicit Routes) ---
router.post("/items/batch", requirePermission(PERMISSIONS.MENU_MANAGE), async (req, res) =>
{
    try
    {
        const { actorId } = req.context;
        const result = await createMenuItemForBranches({ ...req.body, actorId });
        res.status(201).json(result);
    } catch (e) { res.status(400).json({ error: e.message }); }
});

router.patch("/items/batch", requirePermission(PERMISSIONS.MENU_MANAGE), async (req, res) =>
{
    try
    {
        const { actorId } = req.context;
        const result = await updateMenuItemForBranches({ ...req.body, actorId });
        res.json(result);
    } catch (e) { res.status(400).json({ error: e.message }); }
});

router.post("/items/batch/move", requirePermission(PERMISSIONS.MENU_MANAGE), async (req, res) =>
{
    try
    {
        const { actorId } = req.context;
        const result = await moveMenuItemForBranches({ ...req.body, actorId });
        res.json(result);
    } catch (e) { res.status(400).json({ error: e.message }); }
});

router.delete("/items/batch", requirePermission(PERMISSIONS.MENU_MANAGE), async (req, res) =>
{
    try
    {
        const { actorId } = req.context;
        const result = await deleteMenuItemForBranches({ ...req.body, actorId });
        res.json(result);
    } catch (e) { res.status(400).json({ error: e.message }); }
});

// --- PUBLIC ---
router.get("/items/public", async (req, res) =>
{
    try
    {
        const result = await listPublicMenuItems({ branchId: req.context.branchId });
        res.json(result);
    } catch (e) { res.status(400).json({ error: e.message }); }
});

// --- ADMIN SINGLE ---
router.get("/items", requirePermission(PERMISSIONS.MENU_VIEW), async (req, res) =>
{
    try
    {
        const { branchId, role } = req.context;
        const enforcementBranchId = role === 'OWNER' ? null : branchId;
        const result = await listMenuItems({ branchId: enforcementBranchId });
        res.json(result);
    } catch (e) { res.status(400).json({ error: e.message }); }
});

router.post("/items", requirePermission(PERMISSIONS.MENU_MANAGE), async (req, res) =>
{
    try
    {
        const { actorId, branchId, role } = req.context;
        const enforcementBranchId = role === 'OWNER' ? req.body.branchId : branchId; // Handle Owner creating for specific branch

        const result = await createMenuItem({ ...req.body, actorId, branchId: enforcementBranchId });
        res.status(201).json(result);
    } catch (e) { res.status(400).json({ error: e.message }); }
});

router.patch("/items/:id", requirePermission(PERMISSIONS.MENU_MANAGE), async (req, res) =>
{
    try
    {
        const { actorId, branchId, role } = req.context;
        const enforcementBranchId = role === 'OWNER' ? null : branchId;

        const result = await updateMenuItemDetails({ itemId: req.params.id, updates: req.body, actorId, branchId: enforcementBranchId });
        res.json(result);
    } catch (e) { res.status(400).json({ error: e.message }); }
});

router.delete("/items/:id", requirePermission(PERMISSIONS.MENU_MANAGE), async (req, res) =>
{
    try
    {
        const { actorId, branchId, role } = req.context;
        const enforcementBranchId = role === 'OWNER' ? null : branchId;

        await deleteMenuItem({ itemId: req.params.id, actorId, branchId: enforcementBranchId });
        res.sendStatus(204);
    } catch (e) { res.status(400).json({ error: e.message }); }
});

/* ============================================================
   SECTION 3: RECIPES
============================================================ */

router.put("/items/recipe/batch", requirePermission(PERMISSIONS.MENU_MANAGE), async (req, res) =>
{
    try
    {
        const { actorId } = req.context;
        const result = await updateRecipeForBranches({ ...req.body, actorId });
        res.json(result);
    } catch (e) { res.status(400).json({ error: e.message }); }
});

router.get("/items/:itemId/recipe", requirePermission(PERMISSIONS.MENU_VIEW), async (req, res) =>
{
    try
    {
        const { branchId, role } = req.context;
        const enforcementBranchId = role === 'OWNER' ? null : branchId;

        const result = await getRecipeDetails({ menuItemId: req.params.itemId, branchId: enforcementBranchId });
        res.json(result);
    } catch (e) { res.status(400).json({ error: e.message }); }
});

router.put("/items/:itemId/recipe", requirePermission(PERMISSIONS.MENU_MANAGE), async (req, res) =>
{
    try
    {
        const { actorId, branchId, role } = req.context;
        const enforcementBranchId = role === 'OWNER' ? null : branchId;

        const result = await editRecipe({ menuItemId: req.params.itemId, ...req.body, actorId, branchId: enforcementBranchId });
        res.json(result);
    } catch (e) { res.status(400).json({ error: e.message }); }
});

export default router;