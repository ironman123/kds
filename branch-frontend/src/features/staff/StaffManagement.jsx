import { useEffect, useState, useMemo } from 'react';
import { Plus, Trash2, User, Phone, BadgeCheck, MapPin, Search, Filter, Pencil } from 'lucide-react'; // Added Pencil
import toast from 'react-hot-toast';
import
{
    getStaffList,
    hireStaff,
    terminateStaff,
    updateStaffProfile,
    updateStaffRole,
    updateStaffStatus,
    groupStaffByBranch
} from './staffService';
import useUserStore from '../../store/userStore';
import api from '../../api/client';
import clsx from 'clsx';
import '../../styles/pos.css';

export default function StaffManagement()
{
    const { user } = useUserStore();

    // --- STATE ---
    const [rawStaffData, setRawStaffData] = useState(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingStaff, setEditingStaff] = useState(null); // Stores the staff object being edited
    const [loading, setLoading] = useState(true);

    // Filter States
    const [searchTerm, setSearchTerm] = useState('');
    const [filterRole, setFilterRole] = useState('ALL');
    const [showTerminated, setShowTerminated] = useState(false);

    useEffect(() =>
    {
        loadStaff();
    }, [showTerminated]);

    const loadStaff = async () =>
    {
        setLoading(true);
        try
        {
            const data = await getStaffList(showTerminated);
            setRawStaffData(data);
        } catch (err)
        {
            console.error(err);
            toast.error("Failed to load staff list");
        } finally
        {
            setLoading(false);
        }
    };

    const handleTerminate = async (id, name, currentStatus) =>
    {
        if (currentStatus === 'TERMINATED') return;
        if (!confirm(`Are you sure you want to fire ${name}?`)) return;
        try
        {
            await terminateStaff(id);
            toast.success(`${name} has been terminated.`);
            loadStaff();
        } catch (err)
        {
            toast.error(err.response?.data?.error || "Could not terminate staff.");
        }
    };

    // --- RENDER HELPERS ---
    const getStatusStyle = (status) =>
    {
        switch (status)
        {
            case 'ACTIVE': return 'bg-green-50 text-green-700 border-green-100';
            case 'ON_LEAVE': return 'bg-yellow-50 text-yellow-700 border-yellow-100';
            case 'INACTIVE': return 'bg-gray-50 text-gray-600 border-gray-100';
            case 'TERMINATED': return 'bg-red-50 text-red-700 border-red-100 opacity-70';
            default: return 'bg-gray-50 text-gray-500 border-gray-100';
        }
    };

    const renderCard = (employee) => (
        <div key={employee.id} className={clsx("user-card relative group bg-white p-4 rounded-xl border shadow-sm transition-all duration-200", {
            'border-red-100 bg-red-50/30': employee.status === 'TERMINATED',
            'border-gray-200 hover:shadow-md': employee.status !== 'TERMINATED'
        })}>

            <div className="flex items-start gap-3">
                <div className="relative">
                    <div className={clsx("p-2.5 rounded-full shrink-0 border", {
                        'bg-gray-50 border-gray-100': employee.status !== 'TERMINATED',
                        'bg-red-100 border-red-200': employee.status === 'TERMINATED'
                    })}>
                        <User size={20} className={employee.status === 'TERMINATED' ? "text-red-400" : "text-gray-400"} />
                    </div>
                </div>

                <div className="flex-1 min-w-0 pt-0.5">
                    <h3 className={clsx("font-semibold truncate text-[15px]", {
                        'text-gray-900': employee.status !== 'TERMINATED',
                        'text-red-800 line-through': employee.status === 'TERMINATED'
                    })}>{employee.name}</h3>

                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md border tracking-wide bg-blue-50 text-blue-600 border-blue-100">
                            {employee.role}
                        </span>
                        <span className={clsx("text-[10px] font-medium px-1.5 py-0.5 rounded-md border tracking-wide", getStatusStyle(employee.status))}>
                            {employee.status ? employee.status.replace('_', ' ') : 'UNKNOWN'}
                        </span>
                    </div>
                </div>
            </div>

            <div className="mt-3 pt-3 border-t border-gray-50 text-xs text-gray-500 space-y-1.5">
                <div className="flex items-center gap-2">
                    <BadgeCheck size={14} className="text-gray-300" />
                    <span className="font-medium text-gray-400 text-[10px] uppercase tracking-wider">Login:</span>
                    <span className="font-mono text-gray-600 bg-gray-50 px-1.5 py-0.5 rounded text-[11px]">
                        {employee.username || "---"}
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    <Phone size={14} className="text-gray-300" />
                    <span className="text-gray-600">{employee.phone || 'No Phone'}</span>
                </div>

                {employee.branchName && (
                    <div className="flex items-center gap-2 text-yellow-500/80 font-medium">
                        <MapPin size={12} /> {employee.branchName}
                    </div>
                )}
            </div>

            {/* ACTION BUTTONS (Only if NOT terminated) */}
            {employee.status !== 'TERMINATED' && (
                <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {/* EDIT BUTTON */}
                    <button
                        onClick={(e) =>
                        {
                            e.stopPropagation();
                            setEditingStaff(employee); // Open Edit Modal
                        }}
                        className="text-gray-400 hover:text-blue-600 hover:bg-blue-50 p-1.5 rounded-lg transition-all"
                        title="Edit Details"
                    >
                        <Pencil size={16} />
                    </button>

                    {/* DELETE BUTTON */}
                    <button
                        onClick={(e) =>
                        {
                            e.stopPropagation();
                            handleTerminate(employee.id, employee.name, employee.status);
                        }}
                        className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-all"
                        title="Terminate Employee"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            )}
        </div>
    );

    // --- FILTERING ---
    const filteredData = useMemo(() =>
    {
        if (!rawStaffData) return null;
        const matchesFilter = (person) =>
        {
            const matchSearch = person.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (person.phone && person.phone.includes(searchTerm)) ||
                (person.branchName && person.branchName.includes(searchTerm));
            const matchRole = filterRole === 'ALL' || person.role === filterRole;
            return matchSearch && matchRole;
        };

        let processedData = Array.isArray(rawStaffData) ? rawStaffData.filter(matchesFilter) : rawStaffData;

        if (user?.role === 'OWNER')
        {
            // Re-group after filtering if needed, or assume raw is flat and we group here
            // (Assuming rawData is flat list from API)
            return groupStaffByBranch(processedData);
        }
        return processedData;
    }, [rawStaffData, searchTerm, filterRole, user?.role]);

    const renderContent = () =>
    {
        if (loading) return <div className="text-center p-10 text-gray-400">Loading staff...</div>;
        if (!filteredData || (Array.isArray(filteredData) && filteredData.length === 0))
        {
            return <div className="text-center p-10 text-gray-400">No staff found matching filters.</div>;
        }

        if (!Array.isArray(filteredData))
        {
            const branches = Object.keys(filteredData);
            if (branches.length === 0) return <div className="text-center p-10 text-gray-400">No staff found.</div>;
            return branches.map(branchName => (
                <div key={branchName} className="mb-8">
                    <h3 className="text-lg font-bold text-gray-700 mb-3 flex items-center gap-2 border-b pb-2">
                        <MapPin size={20} className="text-yellow-400" /> {branchName}
                        <span className="text-sm font-normal text-gray-400 ml-2">({filteredData[branchName].length} staff)</span>
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredData[branchName].map(renderCard)}
                    </div>
                </div>
            ));
        }
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredData.map(renderCard)}
            </div>
        );
    };

    return (
        <div className="p-6 max-w-7xl mx-auto min-h-screen">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Staff Management</h2>
                    <p className="text-gray-500 text-sm">Manage employees, roles, and status</p>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-yellow-400 text-white font-bold hover:bg-yellow-500 transition shadow-sm hover:shadow-md active:scale-95"
                >
                    <Plus size={20} /> Add New Staff
                </button>
            </div>

            {/* FILTERS */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative w-full md:w-80">
                    <Search className="absolute left-3 top-1/4 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search by name or phone or branch..."
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-yellow-400 outline-none text-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex flex-wrap gap-4 w-full md:w-auto items-center">
                    <div className="flex items-center gap-2">
                        <Filter size={16} className="text-gray-400" />
                        <select
                            className="py-2 pl-2 pr-8 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-yellow-400 outline-none bg-white"
                            value={filterRole}
                            onChange={(e) => setFilterRole(e.target.value)}
                        >
                            <option value="ALL">All Roles</option>
                            <option value="MANAGER">Manager</option>
                            <option value="CAPTAIN">Captain</option>
                            <option value="WAITER">Waiter</option>
                            <option value="CHEF">Chef</option>
                        </select>
                    </div>
                    <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
                        <span className="text-sm font-medium text-gray-600">Show Terminated</span>
                        <button
                            onClick={() => setShowTerminated(!showTerminated)}
                            className={clsx("w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-300 cursor-pointer", {
                                'bg-yellow-500': showTerminated,
                                'bg-gray-300': !showTerminated
                            })}
                        >
                            <div className={clsx("bg-white w-4 h-4 rounded-full shadow-md transform duration-300", { 'translate-x-5': showTerminated })} />
                        </button>
                    </div>
                </div>
            </div>

            {renderContent()}

            {/* MODALS */}
            {showAddModal && (
                <AddStaffModal
                    onClose={() => setShowAddModal(false)}
                    onSuccess={() => { setShowAddModal(false); loadStaff(); }}
                />
            )}

            {editingStaff && (
                <EditStaffModal
                    staff={editingStaff}
                    onClose={() => setEditingStaff(null)}
                    onSuccess={() => { setEditingStaff(null); loadStaff(); }}
                />
            )}
        </div>
    );
}

// --- ADD MODAL (Existing) ---
function AddStaffModal({ onClose, onSuccess })
{
    const { user } = useUserStore();
    const [branches, setBranches] = useState([]);
    const [loadingBranches, setLoadingBranches] = useState(false);
    const [formData, setFormData] = useState({
        name: '', role: 'WAITER', phone: '', adhaarNumber: '',
        branchId: user.role === 'OWNER' ? '' : user.branch_id
    });
    const [newCreds, setNewCreds] = useState(null);

    useEffect(() =>
    {
        if (user.role === 'OWNER')
        {
            setLoadingBranches(true);
            api.get('/branches').then(res => setBranches(res.data))
                .catch(() => setBranches([{ id: 'b1_uuid', name: 'Downtown' }]))
                .finally(() => setLoadingBranches(false));
        }
    }, [user.role]);

    const handleSubmit = async (e) =>
    {
        e.preventDefault();
        try
        {
            const res = await hireStaff(formData);
            setNewCreds(res);
            toast.success("Staff Hired!");
        } catch (err)
        {
            toast.error(err.response?.data?.error || "Failed");
        }
    };

    if (newCreds) return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white p-8 rounded-xl w-full max-w-sm text-center shadow-2xl">
                <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4"><BadgeCheck size={32} className="text-green-600" /></div>
                <h3 className="text-xl font-bold mb-2">Staff Created!</h3>
                <div className="bg-gray-50 p-4 rounded-lg text-left mb-6 border border-gray-200">
                    <div className="mb-3"><span className="text-xs text-gray-400 font-bold">Username</span><div className="font-mono text-lg font-bold">{newCreds.tempCredentials.username}</div></div>
                    <div><span className="text-xs text-gray-400 font-bold">Password</span><div className="font-mono text-lg font-bold text-yellow-500">{newCreds.tempCredentials.password}</div></div>
                </div>
                <button onClick={onSuccess} className="w-full bg-gray-900 text-white py-3 rounded-lg font-bold">Done</button>
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm p-4">
            <div className="bg-white p-6 rounded-xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6"><h2 className="text-xl font-bold">Hire New Staff</h2><button onClick={onClose}>✕</button></div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {user.role === 'OWNER' && (
                        <div><label className="block text-sm font-bold mb-1">Branch</label>
                            <select required className="w-full p-2 border rounded-lg" value={formData.branchId} onChange={e => setFormData({ ...formData, branchId: e.target.value })}>
                                <option value="">Select...</option>{branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </select></div>
                    )}
                    <div><label className="block text-sm font-bold mb-1">Name</label><input required className="w-full p-2 border rounded-lg" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} /></div>
                    <div><label className="block text-sm font-bold mb-1">Role</label><select className="w-full p-2 border rounded-lg" value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })}><option value="WAITER">Waiter</option><option value="MANAGER">Manager</option><option value="CAPTAIN">Captain</option><option value="CHEF">Chef</option></select></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="block text-sm font-bold mb-1">Phone</label><input required className="w-full p-2 border rounded-lg" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} /></div>
                        <div><label className="block text-sm font-bold mb-1">ID</label><input required className="w-full p-2 border rounded-lg" value={formData.adhaarNumber} onChange={e => setFormData({ ...formData, adhaarNumber: e.target.value })} /></div>
                    </div>
                    <div className="flex gap-3 mt-8 pt-4 border-t"><button type="button" onClick={onClose} className="flex-1 p-3 bg-gray-100 rounded-lg">Cancel</button><button type="submit" className="flex-1 p-3 bg-yellow-500 text-white font-bold rounded-lg">Create</button></div>
                </form>
            </div>
        </div>
    );
}

// --- NEW EDIT MODAL ---
function EditStaffModal({ staff, onClose, onSuccess })
{
    const { user } = useUserStore();
    const [formData, setFormData] = useState({
        name: staff.name,
        phone: staff.phone || '',
        role: staff.role,
        status: staff.status
    });

    const handleSubmit = async (e) =>
    {
        e.preventDefault();
        try
        {
            const promises = [];

            // 1. Check Profile Changes
            if (formData.name !== staff.name || formData.phone !== staff.phone)
            {
                promises.push(updateStaffProfile(staff.id, { name: formData.name, phone: formData.phone }));
            }

            // 2. Check Role Changes
            if (formData.role !== staff.role)
            {
                if (user.role === 'OWNER')
                {
                    promises.push(updateStaffRole(staff.id, formData.role));
                } else
                {
                    toast.error("Only Owners can change staff roles.");
                }
            }

            // 3. Check Status Changes (Active / Leave / Inactive)
            if (formData.status !== staff.status)
            {
                promises.push(updateStaffStatus(staff.id, formData.status));
            }

            if (promises.length === 0)
            {
                onClose();
                return;
            }

            await Promise.all(promises);
            toast.success("Staff details updated");
            onSuccess();
        } catch (err)
        {
            console.error(err);
            toast.error(err.response?.data?.error || "Failed to update staff");
        }
    };

    // Helper to render Status Pills
    const StatusPill = ({ value, label, colorClass, activeClass }) => (
        <button
            type="button"
            onClick={() => setFormData({ ...formData, status: value })}
            className={clsx(
                "flex-1 py-2 text-sm font-medium rounded-lg border transition-all duration-200",
                formData.status === value
                    ? `border-transparent shadow-sm ${activeClass}` // Selected State
                    : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50" // Unselected State
            )}
        >
            {label}
        </button>
    );

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm p-4">
            <div className="bg-white p-6 rounded-xl w-full max-w-md shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-gray-800">Edit Staff Details</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">

                    {/* STATUS SELECTOR UI */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Current Status</label>
                        <div className="flex gap-2 bg-gray-50 p-1 rounded-xl">
                            <StatusPill
                                value="ACTIVE"
                                label="Active"
                                activeClass="bg-green-100 text-green-700 ring-1 ring-green-500"
                            />
                            <StatusPill
                                value="ON_LEAVE"
                                label="On Leave"
                                activeClass="bg-yellow-100 text-yellow-700 ring-1 ring-yellow-500"
                            />
                            <StatusPill
                                value="INACTIVE"
                                label="Inactive"
                                activeClass="bg-gray-200 text-gray-700 ring-1 ring-gray-500"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Full Name</label>
                            <input
                                required
                                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Phone</label>
                            <input
                                required
                                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                                value={formData.phone}
                                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Role Editing */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Role</label>
                        <select
                            disabled={user.role !== 'OWNER'}
                            className={clsx("w-full p-2.5 border border-gray-300 rounded-lg outline-none", {
                                "bg-gray-100 text-gray-500 cursor-not-allowed": user.role !== 'OWNER',
                                "bg-white focus:ring-2 focus:ring-orange-500": user.role === 'OWNER'
                            })}
                            value={formData.role}
                            onChange={e => setFormData({ ...formData, role: e.target.value })}
                        >
                            <option value="WAITER">Waiter</option>
                            <option value="MANAGER">Manager</option>
                            <option value="CAPTAIN">Captain</option>
                            <option value="CHEF">Chef</option>
                        </select>
                        {user.role !== 'OWNER' && <p className="text-xs text-gray-400 mt-1">Only Owners can change roles.</p>}
                    </div>

                    <div className="flex gap-3 mt-8 pt-4 border-t border-gray-100">
                        <button type="button" onClick={onClose} className="flex-1 p-3 text-gray-700 bg-gray-100 hover:bg-gray-200 font-semibold rounded-lg transition">Cancel</button>
                        <button type="submit" className="flex-1 p-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-md hover:shadow-lg transition">Save Changes</button>
                    </div>
                </form>
            </div>
        </div>
    );
}