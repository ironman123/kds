import api from '../../api/client';

export const listTables = async (branchId) =>
{
    // If branchId is provided (for Owners filtering), append it query
    const query = branchId ? `?branchId=${branchId}` : '';
    const res = await api.get(`/tables${query}`);
    return res.data;
};

export const createTable = async (label, branchId) =>
{
    const res = await api.post('/tables', { label, branchId });
    return res.data;
};

export const updateTableStatus = async (tableId, status) =>
{
    const res = await api.patch(`/tables/${tableId}/status`, { status });
    return res.data;
};

export const renameTable = async (tableId, label) =>
{
    const res = await api.patch(`/tables/${tableId}`, { label });
    return res.data;
};

export const deleteTable = async (tableId) =>
{
    await api.delete(`/tables/${tableId}`);
};