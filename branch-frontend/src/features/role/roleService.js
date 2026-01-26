import api from '../../api/client';

export const getRoles = async () =>
{
    const res = await api.get('/roles');
    return res.data;
};

export const getPermissionList = async () =>
{
    const res = await api.get('/roles/permissions/list');
    return res.data;
};

export const createRole = async (roleData) =>
{
    // roleData: { name, description, permissions: [], branchId? }
    const res = await api.post('/roles', roleData);
    return res.data;
};

export const updateRole = async (roleId, roleData) =>
{
    const res = await api.put(`/roles/${roleId}`, roleData);
    return res.data;
};

export const deleteRole = async (roleId) =>
{
    const res = await api.delete(`/roles/${roleId}`);
    return res.data;
};