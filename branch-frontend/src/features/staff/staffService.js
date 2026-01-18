import api from '../../api/client';

// 1. GET STAFF
export const getStaffList = async () =>
{
    const res = await api.get('/staff');

    // The backend returns a flat array: [{name: "John", branchName: "Downtown"}, ...]
    // The UI can use this directly, or use the helper below to group them.
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