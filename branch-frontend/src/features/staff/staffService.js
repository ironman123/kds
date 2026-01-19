import api from '../../api/client';

// 1. GET STAFF
export const getStaffList = async (showTerminated = false) =>
{
    // Append query param
    const res = await api.get(`/staff?history=${showTerminated}`);
    return res.data;
};

// 2. HIRE
export const hireStaff = async (staffData) =>
{
    // staffData = { name, role, phone, adhaarNumber }
    const res = await api.post('/staff', staffData);
    return res.data;
};

// 3. FIRE
export const terminateStaff = async (id) =>
{
    const res = await api.patch(`/staff/${id}/status`, { status: 'TERMINATED' });
    return res.data;
};

// --- HELPER UTILITY ---
// Call this in your React Component to organize the data for the Owner view
export const groupStaffByBranch = (staffList) =>
{
    if (!Array.isArray(staffList)) return {};

    return staffList.reduce((groups, person) =>
    {
        const branch = person.branchName || 'Unassigned';

        if (!groups[branch])
        {
            groups[branch] = [];
        }

        groups[branch].push(person);
        return groups;
    }, {});
};

export const updateStaffProfile = async (id, updates) =>
{
    // updates = { name, phone }
    const res = await api.patch(`/staff/${id}`, updates);
    return res.data;
};

// 5. UPDATE ROLE
export const updateStaffRole = async (id, role) =>
{
    // role = 'MANAGER'
    const res = await api.patch(`/staff/${id}/role`, { role });
    return res.data;
};

export const updateStaffStatus = async (id, status) =>
{
    // status = 'ACTIVE' | 'ON_LEAVE' | 'INACTIVE'
    const res = await api.patch(`/staff/${id}/status`, { status });
    return res.data;
};