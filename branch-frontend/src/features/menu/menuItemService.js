import api from '../../api/client';

// --- READ ---
export const getMenuItems = async () =>
{
    const res = await api.get('/menu/items');
    return res.data;
};

export const getRecipeDetails = async (itemId) =>
{
    const res = await api.get(`/menu/items/${itemId}/recipe`);
    return res.data;
};

// --- CREATE ---
// Owner: Batch Create
export const createMenuItemBatch = async (data) =>
{
    // data = { categoryName, name, price, prepTime, recipeInstructions, ingredients, targetBranchIds }

    const res = await api.post('/menu/items/batch', data);
    return res.data;
};

// Manager: Single Create
export const createMenuItemSingle = async (data) =>
{
    // data = { categoryId, name, price, prepTime, recipeInstructions, ingredients }
    const res = await api.post('/menu/items', data);
    return res.data;
};

// --- UPDATE ---
// Single Update (Details Only)
export const updateMenuItemDetails = async (id, updates) =>
{
    const res = await api.patch(`/menu/items/${id}`, updates);
    return res.data;
};

// Batch Update (Details Only)
export const updateMenuItemBatch = async (data) =>
{
    const res = await api.patch('/menu/items/batch', data);
    return res.data;
};

// Single Recipe Edit
export const updateRecipeSingle = async (itemId, data) =>
{
    // data = { instructions, addIngredients, updateIngredients, removeIngredientIds, replaceAllIngredients }
    const res = await api.put(`/menu/items/${itemId}/recipe`, data);
    return res.data;
};

// Batch Recipe Edit (Standardize across branches)
export const updateRecipeBatch = async (data) =>
{
    // data = { itemName, targetBranchIds, newInstructions, newIngredients }
    const res = await api.put('/menu/items/recipe/batch', data);
    return res.data;
};

// --- DELETE ---
export const deleteMenuItem = async (id) =>
{
    await api.delete(`/menu/items/${id}`);
};

export const deleteMenuItemBatch = async (data) =>
{
    // data = { name, targetBranchIds }
    const res = await api.delete('/menu/items/batch', { data });
    return res.data;
};