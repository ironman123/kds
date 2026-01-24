import { useEffect, useState, useMemo } from 'react';
import
{
    Plus, Edit2, Trash2, Check, AlertCircle, Power,
    Layers, MapPin, Search,
    Utensils, Coffee, IceCream, Pizza, Sandwich, Soup, Beef, Salad, Beer, Cake, Wheat, Croissant
} from 'lucide-react';
import toast from 'react-hot-toast';
import
{
    getCategories,
    createCategoryBatch,
    createCategorySingle,
    deleteCategory,
    deleteCategoryBatch,
    updateCategoryDetails,
    updateCategoryBatch,
    toggleCategoryAvailability,
    toggleCategoryAvailabilityBatch
} from './menuService';
import useUserStore from '../../store/userStore';
import api from '../../api/client';
import clsx from 'clsx';
import '../../styles/pos.css';

// --- HELPER: Icon Lookup ---
const getCategoryIcon = (categoryName) =>
{
    if (!categoryName) return <Utensils size={24} />;
    const lowerName = categoryName.toLowerCase();

    if (lowerName.includes('drink') || lowerName.includes('beverage') || lowerName.includes('tea')) return <Coffee size={24} />;
    if (lowerName.includes('dessert') || lowerName.includes('sweet') || lowerName.includes('ice')) return <IceCream size={24} />;
    if (lowerName.includes('burger') || lowerName.includes('sandwich')) return <Sandwich size={24} />;
    if (lowerName.includes('pizza')) return <Pizza size={24} />;
    if (lowerName.includes('pasta') || lowerName.includes('noodle') || lowerName.includes('soup')) return <Soup size={24} />;
    if (lowerName.includes('salad') || lowerName.includes('vegan') || lowerName.includes('veg')) return <Salad size={24} />;
    if (lowerName.includes('steak') || lowerName.includes('grill') || lowerName.includes('meat') || lowerName.includes('beef')) return <Beef size={24} />;
    if (lowerName.includes('alcohol') || lowerName.includes('beer') || lowerName.includes('wine')) return <Beer size={24} />;
    if (lowerName.includes('cake') || lowerName.includes('birthday')) return <Cake size={24} />;
    if (lowerName.includes('bakery') || lowerName.includes('bread')) return <Wheat size={24} />;
    if (lowerName.includes('breakfast') || lowerName.includes('morning')) return <Croissant size={24} />;

    return <Utensils size={24} />;
};

export default function CategoryManagement()
{
    const { user } = useUserStore();
    const [categories, setCategories] = useState([]);
    const [viewMode, setViewMode] = useState('CATEGORY'); // 'CATEGORY' (Batch) | 'BRANCH' (Single)
    const [showModal, setShowModal] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() =>
    {
        loadData();
    }, []);

    const loadData = async () =>
    {
        setLoading(true);
        try
        {
            const data = await getCategories();
            setCategories(data);
        } catch (err)
        {
            console.error(err);
            toast.error("Failed to load categories");
        } finally
        {
            setLoading(false);
        }
    };

    // --- ACTIONS ---

    const handleToggleStatus = async (item, currentStatus) =>
    {
        try
        {
            const newStatus = !currentStatus;

            if (viewMode === 'CATEGORY')
            {
                // BATCH: Toggle availability for ALL IDs in this group
                // (Since we don't have a batch toggle API, we parallelize single calls)
                await toggleCategoryAvailabilityBatch({
                    name: item.name, // Identify category by name
                    updates: { available: newStatus }, // The change
                    targetBranchIds: item.branches.map(b => b.branchId) // Target all associated branches
                });
                toast.success(`Updated ${item.name} in all branches`);
            } else
            {
                // SINGLE
                await toggleCategoryAvailability(item.id, newStatus);
                toast.success("Status updated");
            }
            loadData();
        } catch (err)
        {
            toast.error("Failed to update status");
        }
    };

    const handleDelete = async (item) =>
    {
        if (!confirm(`Are you sure you want to delete '${item.name}'?`)) return;

        try
        {
            if (viewMode === 'CATEGORY')
            {
                // BATCH DELETE
                await deleteCategoryBatch({
                    name: item.name,
                    targetBranchIds: item.branches.map(b => b.branchId)
                });
                toast.success(`Deleted ${item.name} from all branches`);
            } else
            {
                // SINGLE DELETE
                await deleteCategory(item.id);
                toast.success("Category deleted");
            }
            loadData();
        } catch (err)
        {
            console.error(err);
            toast.error(err.response?.data?.error || "Failed to delete");
        }
    };

    // --- DATA PROCESSING ---
    const processedData = useMemo(() =>
    {
        if (!categories) return [];

        // Filter
        const filtered = categories.filter(c =>
            c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (c.branchName && c.branchName.toLowerCase().includes(searchTerm.toLowerCase()))
        );

        if (viewMode === 'BRANCH')
        {
            // GROUP BY BRANCH
            return filtered.reduce((acc, cat) =>
            {
                const bName = cat.branchName || 'Unknown Branch';
                if (!acc[bName]) acc[bName] = [];
                acc[bName].push(cat);
                return acc;
            }, {});
        } else
        {
            // GROUP BY CATEGORY (Batch)
            const groups = filtered.reduce((acc, cat) =>
            {
                if (!acc[cat.name])
                {
                    acc[cat.name] = {
                        name: cat.name,
                        ids: [],
                        branches: [],
                        activeCount: 0,
                        totalCount: 0
                    };
                }
                acc[cat.name].ids.push(cat.id);
                acc[cat.name].branches.push({
                    name: cat.branchName || 'Branch ' + cat.branchId,
                    branchId: cat.branchId,
                    active: cat.available
                });
                if (cat.available) acc[cat.name].activeCount++;
                acc[cat.name].totalCount++;
                return acc;
            }, {});
            return Object.values(groups);
        }
    }, [categories, searchTerm, viewMode]);

    // --- CARD COMPONENT ---
    const CategoryCard = ({ item }) =>
    {
        const isBatch = viewMode === 'CATEGORY';

        // Calculate status for Badge
        const isAllActive = isBatch ? item.activeCount === item.totalCount : item.available;
        const isAllInactive = isBatch ? item.activeCount === 0 : !item.available;
        const isMixed = isBatch && !isAllActive && !isAllInactive;

        return (
            <div className={clsx("bg-white p-5 rounded-xl border shadow-sm hover:shadow-md transition-all relative group/card", {
                "border-gray-200": !isAllInactive,
                "border-gray-100 bg-gray-50/50": isAllInactive
            })}>

                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                        <div className={clsx("w-12 h-12 rounded-full flex items-center justify-center border transition-colors", {
                            "bg-green-50 text-green-600 border-green-100": isAllActive,
                            "bg-yellow-50 text-yellow-600 border-yellow-100": isMixed,
                            "bg-gray-100 text-red-500 border-gray-200": isAllInactive,
                        })}>
                            {getCategoryIcon(item.name)}
                        </div>
                        <div>
                            <h3 className={clsx("font-bold text-lg", isAllInactive ? "text-gray-500" : "text-gray-800")}>
                                {item.name}
                            </h3>
                            <div className="flex items-center gap-1.5 text-xs font-medium">
                                {isBatch ? (
                                    <>
                                        {isAllActive && <span className="text-green-600">Active in all {item.totalCount} branches</span>}
                                        {isAllInactive && <span className="text-gray-400">Inactive in all branches</span>}
                                        {isMixed && <span className="text-yellow-600">Active in {item.activeCount}/{item.totalCount} branches</span>}
                                    </>
                                ) : (
                                    <span className={item.available ? "text-green-600" : "text-gray-400"}>
                                        {item.available ? "Active" : "Inactive"}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Batch Mode: Branch List */}
                {isBatch && (
                    <div className="mb-6">
                        <div className="flex flex-wrap gap-2 mt-1">
                            {item.branches.slice(0, 2).map((b, i) => (
                                <span key={i} className={clsx("px-2 py-1 text-xs rounded-md font-medium border", {
                                    "bg-white border-gray-200 text-gray-700": b.active,
                                    "bg-gray-50 border-gray-100 text-gray-400 line-through": !b.active
                                })}>
                                    {b.name}
                                </span>
                            ))}
                            {item.branches.length > 2 && (
                                <div className="relative group/tooltip">
                                    <span className="px-2 py-1 bg-yellow-50 text-yellow-700 text-xs rounded-md border border-yellow-100 font-bold cursor-help">
                                        +{item.branches.length - 2} more
                                    </span>
                                    {/* Tooltip */}
                                    <div className="absolute left-0 bottom-full mb-2 w-48 bg-gray-900 text-white text-xs rounded-lg p-2 shadow-xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all z-50 max-h-48 overflow-y-auto">
                                        <p className="font-bold border-b border-gray-700 pb-1 mb-1 text-gray-400 uppercase tracking-wider text-[10px]">Locations</p>
                                        <ul className="space-y-1">
                                            {item.branches.map((b, idx) => (
                                                <li key={idx} className="flex justify-between items-center">
                                                    <span className={b.active ? "text-white" : "text-gray-500 line-through"}>{b.name}</span>
                                                    <div className={clsx("w-1.5 h-1.5 rounded-full", b.active ? "bg-green-500" : "bg-gray-600")} />
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div className="grid grid-cols-3 gap-2 mt-4">
                    <button
                        onClick={() => handleToggleStatus(item, isAllActive)}
                        className={clsx("flex items-center justify-center py-2 rounded-lg border transition text-sm font-medium", {
                            "text-red-500 border-red-200 hover:bg-red-50": !isAllActive,
                            "text-gray-500 border-gray-200 hover:bg-gray-100": isAllActive
                        })}
                        title="Toggle Availability"
                    >
                        <Power size={16} />
                    </button>

                    <button
                        onClick={() => setEditingItem(item)}
                        className="flex items-center justify-center py-2 text-blue-600 bg-blue-50 border border-blue-100 rounded-lg hover:bg-blue-100 transition"
                        title="Edit Name"
                    >
                        <Edit2 size={16} />
                    </button>

                    <button
                        onClick={() => handleDelete(item)}
                        className="flex items-center justify-center py-2 text-red-600 bg-red-50 border border-red-100 rounded-lg hover:bg-red-100 transition"
                        title="Delete Category"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div className="p-6 max-w-7xl mx-auto min-h-screen">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Category Management</h2>
                    <p className="text-gray-500 text-sm mb-4">Manage menu categories across branches</p>

                    {/* View Toggles */}
                    <div className="inline-flex bg-gray-100 p-1 rounded-lg">
                        <button
                            onClick={() => setViewMode('CATEGORY')}
                            className={clsx("px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-all", {
                                "bg-white text-gray-900 shadow-sm": viewMode === 'CATEGORY',
                                "text-gray-500 hover:text-gray-700": viewMode !== 'CATEGORY'
                            })}
                        >
                            <Layers size={16} /> Group by Category
                        </button>
                        <button
                            onClick={() => setViewMode('BRANCH')}
                            className={clsx("px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-all", {
                                "bg-white text-gray-900 shadow-sm": viewMode === 'BRANCH',
                                "text-gray-500 hover:text-gray-700": viewMode !== 'BRANCH'
                            })}
                        >
                            <MapPin size={16} /> Group by Branch
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input
                            type="text"
                            placeholder="Search categories..."
                            className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-yellow-500 outline-none"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <button
                        onClick={() => setShowModal(true)}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-yellow-500 text-white font-bold hover:bg-yellow-600 shadow-sm hover:shadow-md transition active:scale-95 whitespace-nowrap"
                    >
                        <Plus size={20} /> Add
                    </button>
                </div>
            </div>

            {/* Content */}
            {loading ? (
                <div className="text-center p-12 text-gray-400">Loading...</div>
            ) : (
                <>
                    {/* CATEGORY VIEW */}
                    {viewMode === 'CATEGORY' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {processedData.length > 0 ? processedData.map((item, idx) => (
                                <CategoryCard key={idx} item={item} />
                            )) : <p className="text-gray-400 col-span-3 text-center">No categories found.</p>}
                        </div>
                    )}

                    {/* BRANCH VIEW */}
                    {viewMode === 'BRANCH' && (
                        <div className="space-y-8">
                            {Object.keys(processedData).length > 0 ? Object.keys(processedData).map(branchName => (
                                <div key={branchName}>
                                    <h3 className="text-lg font-bold text-gray-700 mb-3 flex items-center gap-2 border-b border-gray-100 pb-2">
                                        <MapPin size={18} className="text-gray-400" /> {branchName}
                                        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                                            {processedData[branchName].length} items
                                        </span>
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {processedData[branchName].map((cat) => (
                                            <CategoryCard key={cat.id} item={cat} />
                                        ))}
                                    </div>
                                </div>
                            )) : <p className="text-gray-400 text-center">No categories found.</p>}
                        </div>
                    )}
                </>
            )}

            {/* MODALS */}
            {showModal && (
                <AddCategoryModal
                    onClose={() => setShowModal(false)}
                    onSuccess={() => { setShowModal(false); loadData(); }}
                />
            )}

            {editingItem && (
                <EditCategoryModal
                    item={editingItem}
                    mode={viewMode}
                    onClose={() => setEditingItem(null)}
                    onSuccess={() => { setEditingItem(null); loadData(); }}
                />
            )}
        </div>
    );
}

// --- ADD MODAL ---
// --- UPDATED ADD MODAL ---
function AddCategoryModal({ onClose, onSuccess })
{
    const { user } = useUserStore();
    const [name, setName] = useState('');
    const [selectedBranches, setSelectedBranches] = useState([]);
    const [availableBranches, setAvailableBranches] = useState([]);
    const [loadingBranches, setLoadingBranches] = useState(false);

    // Fetch branches if Owner
    useEffect(() =>
    {
        if (user.role === 'OWNER')
        {
            setLoadingBranches(true);
            api.get('/branches')
                .then(res =>
                {
                    setAvailableBranches(res.data);
                    setSelectedBranches(res.data.map(b => b.id)); // Default select all
                })
                .catch(() => setAvailableBranches([]))
                .finally(() => setLoadingBranches(false));
        }
    }, [user.role]);

    const handleSubmit = async (e) =>
    {
        e.preventDefault();
        try
        {
            if (user.role === 'OWNER')
            {
                if (selectedBranches.length === 0) return toast.error("Select at least one branch");
                await createCategoryBatch({ name, targetBranchIds: selectedBranches });
            } else
            {
                await createCategorySingle({ name });
            }
            toast.success("Category Created!");
            onSuccess();
        } catch (err)
        {
            toast.error(err.response?.data?.error || "Failed to create");
        }
    };

    // Toggle individual branch
    const toggleBranch = (id) =>
    {
        if (selectedBranches.includes(id))
        {
            setSelectedBranches(prev => prev.filter(b => b !== id));
        } else
        {
            setSelectedBranches(prev => [...prev, id]);
        }
    };

    // Toggle a whole group (Location)
    const toggleGroup = (groupBranches) =>
    {
        const groupIds = groupBranches.map(b => b.id);
        const allSelected = groupIds.every(id => selectedBranches.includes(id));

        if (allSelected)
        {
            // Deselect all in this group
            setSelectedBranches(prev => prev.filter(id => !groupIds.includes(id)));
        } else
        {
            // Select all in this group (merge unique)
            setSelectedBranches(prev => [...new Set([...prev, ...groupIds])]);
        }
    };

    // Grouping Logic
    const groupedBranches = useMemo(() =>
    {
        return availableBranches.reduce((acc, branch) =>
        {
            // Use branch.location or fallback to 'General' if your API doesn't have it yet
            const loc = branch.location || branch.city || "All Locations";
            if (!acc[loc]) acc[loc] = [];
            acc[loc].push(branch);
            return acc;
        }, {});
    }, [availableBranches]);

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm p-4">
            {/* Widened modal to max-w-4xl for the 2-column layout */}
            <div className="bg-white rounded-xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-gray-100">
                    <h2 className="text-xl font-bold text-gray-800">Add New Category</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">✕</button>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col md:flex-row">

                    {/* LEFT COLUMN: Input Details */}
                    <div className="md:w-1/3 p-6 border-r border-gray-100 bg-gray-50/50">
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                    Category Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    required
                                    autoFocus
                                    placeholder="e.g. Pizza, Burgers, Salads"
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 outline-none transition shadow-sm"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                />
                                <p className="text-xs text-gray-400 mt-2">
                                    This name will be visible on the POS and KDS screens.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: Branch Selection */}
                    <div className="md:w-2/3 p-6 overflow-y-auto bg-white">
                        {user.role === 'OWNER' ? (
                            <>
                                <div className="mb-4">
                                    <label className="block text-sm font-bold text-gray-700">
                                        Select Branches <span className="text-red-500">*</span> <span className="font-normal text-gray-500">(Grouped by Location)</span>
                                    </label>
                                </div>

                                {loadingBranches ? (
                                    <div className="flex items-center justify-center h-40 text-gray-400">Loading branches...</div>
                                ) : (
                                    <div className="space-y-6">
                                        {Object.entries(groupedBranches).map(([location, branches]) =>
                                        {
                                            const allSelected = branches.every(b => selectedBranches.includes(b.id));

                                            return (
                                                <div key={location}>
                                                    {/* Group Header */}
                                                    <div className="flex justify-between items-center mb-2 px-1">
                                                        <h4 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                                                            <MapPin size={14} className="text-gray-400" />
                                                            {location}
                                                            <span className="text-xs font-normal text-gray-400">({branches.length})</span>
                                                        </h4>
                                                        <button
                                                            type="button"
                                                            onClick={() => toggleGroup(branches)}
                                                            className={clsx("text-xs font-semibold hover:underline", {
                                                                "text-yellow-600": !allSelected,
                                                                "text-gray-400": allSelected
                                                            })}
                                                        >
                                                            {allSelected ? "Deselect All" : "Select All"}
                                                        </button>
                                                    </div>

                                                    {/* Branch Cards */}
                                                    <div className="space-y-2">
                                                        {branches.map(branch =>
                                                        {
                                                            const isSelected = selectedBranches.includes(branch.id);
                                                            return (
                                                                <div
                                                                    key={branch.id}
                                                                    onClick={() => toggleBranch(branch.id)}
                                                                    className={clsx("border rounded-lg p-3 cursor-pointer transition-all flex items-start gap-3 group", {
                                                                        "border-yellow-300 bg-yellow-50 shadow-sm": isSelected,
                                                                        "border-gray-200 hover:border-gray-300 hover:bg-gray-50": !isSelected
                                                                    })}
                                                                >
                                                                    {/* Checkbox Visual */}
                                                                    <div className={clsx("mt-0.5 w-5 h-5 rounded border flex items-center justify-center transition-colors shrink-0", {
                                                                        "bg-blue-600 border-blue-600 text-white": isSelected, // Checkbox uses Blue like reference? Or yellow?
                                                                        "bg-white border-gray-300 group-hover:border-gray-400": !isSelected
                                                                    })}>
                                                                        {isSelected && <Check size={14} strokeWidth={3} />}
                                                                    </div>

                                                                    <div>
                                                                        <div className={clsx("text-sm font-semibold", isSelected ? "text-gray-900" : "text-gray-700")}>
                                                                            {branch.name}
                                                                        </div>
                                                                        <div className="text-xs text-gray-500 mt-0.5">
                                                                            {branch.address || "Location details unavailable"}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 p-8 bg-gray-50 rounded-lg border border-dashed">
                                <MapPin size={32} className="text-gray-300 mb-2" />
                                <p>You are adding this category to your current branch only.</p>
                            </div>
                        )}
                    </div>
                </form>

                {/* Footer Buttons */}
                <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-white rounded-b-xl">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-6 py-2.5 text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 font-semibold rounded-lg transition"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        className="px-6 py-2.5 bg-yellow-600 text-white font-bold rounded-lg hover:bg-yellow-700 shadow-md hover:shadow-lg transition flex items-center gap-2"
                    >
                        <Plus size={18} /> Create Category
                    </button>
                </div>
            </div>
        </div>
    );
}

// --- EDIT MODAL ---
function EditCategoryModal({ item, mode, onClose, onSuccess })
{
    const [name, setName] = useState(item.name);

    const handleSubmit = async (e) =>
    {
        e.preventDefault();
        try
        {
            if (mode === 'CATEGORY')
            {
                // BATCH EDIT
                await updateCategoryBatch({
                    name: item.name,
                    updates: { name },
                    targetBranchIds: item.branches.map(b => b.branchId)
                });
                toast.success(`Renamed to '${name}' in all branches`);
            } else
            {
                // SINGLE EDIT
                await updateCategoryDetails(item.id, { name });
                toast.success("Renamed successfully");
            }
            onSuccess();
        } catch (err)
        {
            toast.error("Failed to update");
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm p-4">
            <div className="bg-white p-6 rounded-xl w-full max-w-sm shadow-2xl">
                <h2 className="text-lg font-bold mb-4">Edit Category</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Name</label>
                        <input required className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={name} onChange={e => setName(e.target.value)} />
                    </div>
                    {mode === 'CATEGORY' && (
                        <div className="text-xs text-yellow-600 bg-yellow-50 p-2 rounded">
                            ⚠️ This will rename "{item.name}" in all {item.totalCount} branches.
                        </div>
                    )}
                    <div className="flex gap-3">
                        <button type="button" onClick={onClose} className="flex-1 py-2 bg-gray-100 rounded-lg">Cancel</button>
                        <button type="submit" className="flex-1 py-2 bg-blue-600 text-white font-bold rounded-lg">Save</button>
                    </div>
                </form>
            </div>
        </div>
    );
}