import { useEffect, useState, useMemo } from 'react';
import
{
    Shield, Plus, Edit2, Trash2, CheckSquare, Square,
    Lock, Info, Users
} from 'lucide-react';
import toast from 'react-hot-toast';
import
{
    getRoles, createRole, updateRole, deleteRole, getPermissionList
} from './roleService';
import useUserStore from '../../store/userStore';
import clsx from 'clsx';

export default function RoleManagement()
{
    const { user } = useUserStore();
    const [roles, setRoles] = useState([]);
    const [allPermissions, setAllPermissions] = useState([]);
    const [loading, setLoading] = useState(true);

    // Modal State
    const [showModal, setShowModal] = useState(false);
    const [editingRole, setEditingRole] = useState(null);

    useEffect(() =>
    {
        loadData();
    }, []);

    const loadData = async () =>
    {
        setLoading(true);
        try
        {
            const [rolesData, permsData] = await Promise.all([
                getRoles(),
                getPermissionList()
            ]);
            setRoles(rolesData);
            setAllPermissions(permsData);
        } catch (err)
        {
            console.error(err);
            toast.error("Failed to load roles");
        } finally
        {
            setLoading(false);
        }
    };

    const handleDelete = async (role) =>
    {
        if (role.isSystem) return toast.error("Cannot delete System Roles");
        if (!confirm(`Delete role '${role.name}'? Staff assigned to this role will lose access.`)) return;

        try
        {
            await deleteRole(role.id);
            toast.success("Role deleted");
            loadData();
        } catch (err)
        {
            toast.error(err.response?.data?.error || "Failed to delete");
        }
    };

    // --- GROUP PERMISSIONS FOR UI ---
    // Groups permissions by resource (e.g., "MENU", "TABLE")
    const groupedPermissions = useMemo(() =>
    {
        return allPermissions.reduce((acc, p) =>
        {
            if (!acc[p.resource]) acc[p.resource] = [];
            acc[p.resource].push(p);
            return acc;
        }, {});
    }, [allPermissions]);

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* HEADER */}
            <div className="flex justify-between items-end mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <Shield className="text-yellow-600" /> Role & Permissions
                    </h2>
                    <p className="text-gray-500 text-sm mt-1">Define what your staff can access.</p>
                </div>
                <button
                    onClick={() => { setEditingRole(null); setShowModal(true); }}
                    className="flex items-center gap-2 px-5 py-2.5 bg-yellow-600 text-white font-bold rounded-lg hover:bg-yellow-700 shadow-md transition"
                >
                    <Plus size={20} /> Create New Role
                </button>
            </div>

            {/* CONTENT */}
            {loading ? (
                <div className="text-center py-12 text-gray-400">Loading roles...</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {roles.map(role => (
                        <div key={role.id} className={clsx("bg-white p-5 rounded-xl border shadow-sm relative group transition hover:shadow-md", role.isSystem ? "border-blue-100 bg-blue-50/30" : "border-gray-200")}>
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <h3 className="font-bold text-lg text-gray-800">{role.name}</h3>
                                    {role.isSystem && (
                                        <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full inline-flex items-center gap-1 mt-1">
                                            <Lock size={10} /> System Default
                                        </span>
                                    )}
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => { setEditingRole(role); setShowModal(true); }} className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg">
                                        <Edit2 size={16} />
                                    </button>
                                    {!role.isSystem && (
                                        <button onClick={() => handleDelete(role)} className="p-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg">
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            <p className="text-sm text-gray-500 mb-4 h-10 line-clamp-2">
                                {role.description || "No description provided."}
                            </p>

                            <div className="border-t pt-3">
                                <div className="text-xs font-bold text-gray-400 uppercase mb-2">Access Rights</div>
                                <div className="flex flex-wrap gap-2">
                                    {role.permissions.slice(0, 5).map(pId =>
                                    {
                                        // 1. Find the full permission object to get the description
                                        const perm = allPermissions.find(p => p.id === pId);

                                        // 2. Use description if found, otherwise fallback to ID
                                        // We truncate slightly to keep cards neat
                                        const label = perm ? perm.description : pId;

                                        return (
                                            <span key={pId} className="px-2 py-1 bg-gray-100 text-gray-600 text-[10px] rounded border border-gray-200 truncate max-w-[150px]" title={label}>
                                                {label}
                                            </span>
                                        );
                                    })}
                                    {role.permissions.length > 5 && (
                                        <span className="px-2 py-1 bg-gray-100 text-gray-400 text-xs rounded border border-gray-200">
                                            +{role.permissions.length - 5} more
                                        </span>
                                    )}
                                    {role.permissions.length === 0 && <span className="text-xs text-gray-400 italic">No permissions assigned</span>}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* MODAL */}
            {showModal && (
                <RoleModal
                    role={editingRole}
                    permissionsMap={groupedPermissions}
                    userRole={user.role}
                    onClose={() => setShowModal(false)}
                    onSuccess={() => { setShowModal(false); loadData(); }}
                />
            )}
        </div>
    );
}

// --- SUB-COMPONENT: MODAL ---
function RoleModal({ role, permissionsMap, userRole, onClose, onSuccess })
{
    const isEdit = !!role;
    const isSystem = role?.isSystem;

    const [formData, setFormData] = useState({
        name: role?.name || '',
        description: role?.description || '',
        permissions: role?.permissions || []
    });

    const togglePermission = (permId) =>
    {
        setFormData(prev =>
        {
            const hasIt = prev.permissions.includes(permId);
            return {
                ...prev,
                permissions: hasIt
                    ? prev.permissions.filter(p => p !== permId)
                    : [...prev.permissions, permId]
            };
        });
    };

    const handleSubmit = async (e) =>
    {
        e.preventDefault();
        try
        {
            if (isEdit)
            {
                await updateRole(role.id, formData);
                toast.success("Role updated");
            } else
            {
                await createRole(formData);
                toast.success("Role created");
            }
            onSuccess();
        } catch (err)
        {
            toast.error(err.response?.data?.error || "Operation failed");
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            {/* MODAL CONTAINER
               - max-h-[85vh]: Limits height to 85% of screen so it doesn't get cut off.
               - flex flex-col: Organizes Header (Top) -> Content (Middle) -> Footer (Bottom).
               - overflow-hidden: Prevents the modal container itself from scrolling, forcing inner scroll.
            */}
            <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden border border-gray-100">

                {/* 1. HEADER (Fixed) */}
                <div className="px-5 py-3 border-b flex justify-between items-center shrink-0 bg-white z-10">
                    <div>
                        <h3 className="text-base font-bold text-gray-800">
                            {isEdit ? 'Edit Role' : 'New Role'}
                        </h3>
                        <p className="text-[10px] text-gray-500">Set permissions for this role</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-gray-100 transition">✕</button>
                </div>

                {/* 2. SCROLLABLE CONTENT AREA 
                   - flex-1: Takes up all remaining height.
                   - overflow-y-auto: Adds scrollbar if content is too tall.
                   - min-h-0: Crucial fix for nested flex scrolling issues.
                */}
                <div className="flex-1 overflow-y-auto min-h-0 bg-gray-50/50">
                    <form id="role-form" onSubmit={handleSubmit} className="p-5 space-y-5">

                        {/* FORM INPUTS (Now part of the scrollable area) */}
                        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm space-y-3">
                            <div>
                                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Role Name</label>
                                <input
                                    disabled={isSystem}
                                    className={clsx("w-full px-3 py-2 border rounded-md focus:ring-1 focus:ring-orange-500 outline-none text-sm bg-gray-50", isSystem && "cursor-not-allowed opacity-70")}
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="e.g. Senior Waiter"
                                    required
                                />
                                {isSystem && <div className="text-[10px] text-blue-600 mt-1 flex items-center gap-1"><Lock size={10} /> System locked</div>}
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Description</label>
                                <textarea
                                    className="w-full px-3 py-2 border rounded-md focus:ring-1 focus:ring-orange-500 outline-none text-sm bg-gray-50 resize-none h-20"
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Brief description..."
                                />
                            </div>
                        </div>

                        {/* PERMISSIONS LIST (Scrolls along with inputs) */}
                        <div>
                            <h4 className="font-bold text-gray-700 mb-3 flex items-center gap-2 text-xs uppercase tracking-wider">
                                <Shield size={14} className="text-orange-600" /> Access Controls
                            </h4>

                            <div className="space-y-3">
                                {Object.entries(permissionsMap).map(([resource, perms]) => (
                                    <div key={resource} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                                        <div className="bg-gray-50/50 px-3 py-2 border-b border-gray-100">
                                            <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-wider">
                                                {resource}
                                            </h5>
                                        </div>
                                        <div className="divide-y divide-gray-50">
                                            {perms.map(p =>
                                            {
                                                const isChecked = formData.permissions.includes(p.id);
                                                return (
                                                    <div
                                                        key={p.id}
                                                        onClick={() => togglePermission(p.id)}
                                                        className={clsx(
                                                            "flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-gray-50 transition-colors",
                                                            isChecked ? "bg-orange-50/30" : ""
                                                        )}
                                                    >
                                                        <div className={clsx(
                                                            "w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors",
                                                            isChecked ? "bg-orange-500 border-orange-500" : "bg-white border-gray-300"
                                                        )}>
                                                            {isChecked && <CheckSquare size={12} className="text-white" />}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className={clsx("text-xs font-semibold", isChecked ? "text-orange-700" : "text-gray-700")}>
                                                                {p.id}
                                                            </div>
                                                            <div className="text-[10px] text-gray-400 truncate">
                                                                {p.description}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </form>
                </div>

                {/* 3. FOOTER (Fixed) */}
                <div className="px-5 py-3 border-t bg-gray-50/80 backdrop-blur-sm flex justify-end gap-2 shrink-0 rounded-b-xl z-10">
                    <button onClick={onClose} className="px-3 py-1.5 bg-white border border-gray-300 rounded-md text-gray-700 text-xs font-semibold hover:bg-gray-100 transition shadow-sm">
                        Cancel
                    </button>
                    <button onClick={handleSubmit} className="px-4 py-1.5 bg-orange-600 text-white text-xs font-bold rounded-md hover:bg-orange-700 shadow-sm transition active:scale-95">
                        {isEdit ? "Save Changes" : "Create Role"}
                    </button>
                </div>
            </div>
        </div>
    );
}