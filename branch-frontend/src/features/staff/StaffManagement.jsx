import { useEffect, useState } from 'react';
import { Plus, Trash2, User, Phone, BadgeCheck, MapPin } from 'lucide-react'; // Added MapPin icon
import toast from 'react-hot-toast';
import { getStaffList, hireStaff, terminateStaff, groupStaffByBranch } from './staffService';
import useUserStore from '../../store/userStore'; // To check role if needed
import clsx from 'clsx';
import '../../styles/pos.css';

export default function StaffManagement()
{
    const { user } = useUserStore();
    const [staffData, setStaffData] = useState(null); // Can be Array or Object
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() =>
    {
        loadStaff();
    }, []);

    const loadStaff = async () =>
    {
        try
        {
            const data = await getStaffList();

            // 🧠 Smart Logic: If Owner, group it. If Manager, keep it flat.
            // (You can also do this logic in the Service layer if you prefer)
            if (user?.role === 'OWNER')
            {
                setStaffData(groupStaffByBranch(data));
            } else
            {
                setStaffData(data);
            }
        } catch (err)
        {
            console.error(err);
            toast.error("Failed to load staff list");
        } finally
        {
            setLoading(false);
        }
    };

    const handleTerminate = async (id, name) =>
    {
        if (!confirm(`Are you sure you want to fire ${name}?`)) return;
        try
        {
            await terminateStaff(id);
            toast.success(`${name} has been terminated.`);
            loadStaff();
        } catch (err)
        {
            toast.error("Could not terminate staff. ", err);
        }
    };

    // --- RENDER HELPERS ---

    // Renders a single card (Re-usable)
    const renderCard = (employee) => (
        <div key={employee.id} className="user-card relative group bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition">
            <div className="flex justify-between items-start">
                <div>
                    <h3 className="font-bold text-lg">{employee.name}</h3>
                    <span className={clsx("text-xs font-bold px-2 py-1 rounded-full uppercase inline-block mt-1", {
                        'bg-purple-100 text-purple-700': employee.role === 'MANAGER',
                        'bg-blue-100 text-blue-700': employee.role === 'WAITER',
                        'bg-green-100 text-green-700': employee.role === 'CAPTAIN',
                        'bg-orange-100 text-orange-700': employee.role === 'CHEF',
                        'bg-gray-100 text-gray-700': employee.role === 'HELPER',
                    })}>
                        {employee.role}
                    </span>
                </div>
                <div className="p-2 bg-gray-50 rounded-full">
                    <User size={20} className="text-gray-400" />
                </div>
            </div>

            <div className="mt-4 text-sm text-gray-500 space-y-1">
                <div className="flex items-center gap-2">
                    <BadgeCheck size={16} /> <span className="font-mono">{employee.username}</span>
                </div>
                <div className="flex items-center gap-2">
                    <Phone size={16} /> {employee.phone || 'No Phone'}
                </div>
                {/* Show Branch Name if it exists (useful for Owners viewing flat lists) */}
                {employee.branchName && (
                    <div className="flex items-center gap-2 text-xs text-gray-400 mt-2 pt-2 border-t border-gray-100">
                        <MapPin size={12} /> {employee.branchName}
                    </div>
                )}
            </div>

            <button
                onClick={() => handleTerminate(employee.id, employee.name)}
                className="absolute top-4 right-4 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition p-2 hover:bg-red-50 rounded-full"
                title="Terminate Employee"
            >
                <Trash2 size={18} />
            </button>
        </div>
    );

    // Decides how to render the list based on data type
    const renderContent = () =>
    {
        if (loading) return <div className="text-center p-10 text-gray-400">Loading staff...</div>;
        if (!staffData) return <div className="text-center p-10 text-gray-400">No staff found.</div>;

        // SCENARIO A: Owner View (Object with keys)
        if (!Array.isArray(staffData))
        {
            return Object.keys(staffData).map(branchName => (
                <div key={branchName} className="mb-8">
                    <h3 className="text-lg font-bold text-gray-700 mb-3 flex items-center gap-2">
                        <MapPin size={20} className="text-orange-500" />
                        {branchName}
                        <span className="text-sm font-normal text-gray-400 ml-2">({staffData[branchName].length} staff)</span>
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {staffData[branchName].map(renderCard)}
                    </div>
                </div>
            ));
        }

        // SCENARIO B: Manager View (Flat Array)
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {staffData.map(renderCard)}
            </div>
        );
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Staff Management</h2>
                    <p className="text-gray-500 text-sm">Manage employees and roles</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-orange-600 text-white font-bold hover:bg-orange-700 transition shadow-sm hover:shadow-md active:scale-95"
                >
                    <Plus size={20} /> Add New Staff
                </button>
            </div>

            {renderContent()}

            {showModal && (
                <AddStaffModal
                    onClose={() => setShowModal(false)}
                    onSuccess={() => { setShowModal(false); loadStaff(); }}
                />
            )}
        </div>
    );
}

// ... (Keep your AddStaffModal exactly as it was, it's perfect)
// Just ensure you verify where 'hireStaff' sends the request (it should generally go to the current user's branch context)
function AddStaffModal({ onClose, onSuccess })
{
    // ... (Your existing modal code) ...
    const [formData, setFormData] = useState({ name: '', role: 'WAITER', phone: '', adhaarNumber: '' });
    const [newCreds, setNewCreds] = useState(null); // To show the "Copy this password" screen

    const handleSubmit = async (e) =>
    {
        e.preventDefault();
        try
        {
            const res = await hireStaff(formData);
            setNewCreds(res); // Show success screen
            toast.success("Staff Hired Successfully!");
        } catch (err)
        {
            toast.error("Failed to hire staff. ", err);
        }
    };

    if (newCreds)
    {
        return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-white p-8 rounded-xl w-96 text-center shadow-2xl">
                    <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                        <BadgeCheck size={32} className="text-green-600" />
                    </div>
                    <h3 className="text-xl font-bold mb-2">Staff Created!</h3>
                    <p className="text-gray-500 mb-6 text-sm">Write these down. You won't see them again.</p>

                    <div className="bg-gray-50 p-4 rounded-lg text-left mb-6 border border-gray-200">
                        <div className="mb-3">
                            <span className="text-xs text-gray-400 uppercase font-bold tracking-wider">Username</span>
                            <div className="font-mono text-lg font-bold text-gray-800">{newCreds.tempCredentials.username}</div>
                        </div>
                        <div>
                            <span className="text-xs text-gray-400 uppercase font-bold tracking-wider">Temp Password</span>
                            <div className="font-mono text-lg font-bold text-orange-600">{newCreds.tempCredentials.password}</div>
                        </div>
                    </div>

                    <button onClick={onSuccess} className="w-full bg-gray-900 hover:bg-black text-white py-3 rounded-lg font-bold transition">
                        Done
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="bg-white p-6 rounded-xl w-full max-w-md shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-gray-800">Hire New Staff</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Full Name</label>
                        <input
                            required
                            placeholder="e.g. Rahul Kumar"
                            className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Role</label>
                        <select
                            className="w-full p-2.5 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-orange-500 outline-none transition"
                            value={formData.role}
                            onChange={e => setFormData({ ...formData, role: e.target.value })}
                        >
                            <option value="WAITER">Waiter</option>
                            <option value="MANAGER">Manager</option>
                            <option value="CAPTAIN">Captain</option>
                            <option value="CHEF">Chef</option>
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Phone</label>
                            <input
                                required
                                placeholder="98765..."
                                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none transition"
                                value={formData.phone}
                                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Govt ID</label>
                            <input
                                required
                                placeholder="Adhaar/PAN"
                                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none transition"
                                value={formData.adhaarNumber}
                                onChange={e => setFormData({ ...formData, adhaarNumber: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="flex gap-3 mt-8">
                        <button type="button" onClick={onClose} className="flex-1 p-3 text-gray-700 bg-gray-100 hover:bg-gray-200 font-semibold rounded-lg transition">Cancel</button>
                        <button type="submit" className="flex-1 p-3 bg-orange-600 text-white font-bold rounded-lg hover:bg-orange-700 shadow-md hover:shadow-lg transition">Create Staff</button>
                    </div>
                </form>
            </div>
        </div>
    );
}