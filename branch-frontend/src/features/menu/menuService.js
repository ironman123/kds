import api from '../../api/client';

// --- READ ---
export const getCategories = async () =>
{
    const res = await api.get('/menu/categories');
    return res.data;
};

// --- CREATE ---
// Owner: Create category in multiple branches
export const createCategoryBatch = async (data) =>
{
    // data = { name, targetBranchIds: ['b1', 'b2'] }
    const res = await api.post('/menu/categories/batch', data);
    return res.data;
};

// Manager: Create in single branch
export const createCategorySingle = async (data) =>
{
    // data = { name }
    const res = await api.post('/menu/categories', data);
    return res.data;
};

// --- UPDATE ---
// Single Edit (Name/SortOrder)
export const updateCategoryDetails = async (id, updates) =>
{
    // updates = { name, sortOrder }
    const res = await api.patch(`/menu/categories/${id}`, updates);
    return res.data;
};

// Batch Edit (Name)
export const updateCategoryBatch = async (data) =>
{
    // data = { name: "OldName", updates: { name: "NewName" }, targetBranchIds: [...] }
    const res = await api.patch('/menu/categories/batch', data);
    return res.data;
};

// Single Toggle Availability
export const toggleCategoryAvailability = async (id, available) =>
{
    // available = boolean
    const res = await api.patch(`/menu/categories/${id}/availability`, { available });
    return res.data;
};

export const toggleCategoryAvailabilityBatch = async (data) =>
{
    // data = { name, updates: { available: boolean }, targetBranchIds: [...] }
    // We utilize the generic batch update endpoint
    const res = await api.patch('/menu/categories/batch', data);
    return res.data;
};

// --- DELETE ---
// Single Delete
export const deleteCategory = async (id) =>
{
    await api.delete(`/menu/categories/${id}`);
};

// Batch Delete
export const deleteCategoryBatch = async (data) =>
{
    // data = { name, targetBranchIds: [...] }
    // axios delete requires a 'data' property for the body
    const res = await api.delete('/menu/categories/batch', { data });
    return res.data;
};