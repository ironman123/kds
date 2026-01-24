import { useEffect, useState, useMemo } from 'react';
import
{
    Plus, Edit2, Trash2, Layers, MapPin, Search, Check,
    DollarSign, Clock, ChefHat, List, Utensils,
    Coffee, IceCream, Pizza, Sandwich, Soup, Beef, Salad, Beer, Cake, Wheat, Croissant
} from 'lucide-react';
import toast from 'react-hot-toast';
import
{
    getMenuItems, createMenuItemBatch, createMenuItemSingle,
    updateMenuItemDetails, updateMenuItemBatch,
    deleteMenuItem, deleteMenuItemBatch,
    getRecipeDetails, updateRecipeSingle, updateRecipeBatch
} from './menuItemService';
import { getCategories } from './menuService'; // Reusing Category Service
import useUserStore from '../../store/userStore';
import api from '../../api/client';
import clsx from 'clsx';
import '../../styles/pos.css';

// --- HELPER: Icons (Reused) ---
const getCategoryIcon = (name) =>
{
    if (!name) return <Utensils size={20} />;
    const n = name.toLowerCase();
    if (n.includes('burger')) return <Sandwich size={20} />;
    if (n.includes('pizza')) return <Pizza size={20} />;
    if (n.includes('drink')) return <Coffee size={20} />;
    if (n.includes('dessert')) return <IceCream size={20} />;
    return <Utensils size={20} />;
};

export default function MenuItemManagement()
{
    const { user } = useUserStore();
    const [items, setItems] = useState([]);
    const [categories, setCategories] = useState([]); // Needed for dropdowns
    const [viewMode, setViewMode] = useState('ITEM'); // 'ITEM' (Batch) | 'BRANCH' (Single)
    const [showModal, setShowModal] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => { loadData(); }, []);

    const loadData = async () =>
    {
        setLoading(true);
        try
        {
            const [itemsData, catsData] = await Promise.all([getMenuItems(), getCategories()]);
            setItems(itemsData);
            setCategories(catsData);
        } catch (err)
        {
            console.error(err);
            toast.error("Failed to load menu data");
        } finally
        {
            setLoading(false);
        }
    };

    const handleDelete = async (item) =>
    {
        if (!confirm(`Delete '${item.name}'?`)) return;
        try
        {
            if (viewMode === 'ITEM')
            {
                await deleteMenuItemBatch({
                    name: item.name,
                    targetBranchIds: item.branches.map(b => b.branchId)
                });
                toast.success(`Deleted ${item.name} from all branches`);
            } else
            {
                await deleteMenuItem(item.id);
                toast.success("Item deleted");
            }
            loadData();
        } catch (err)
        {
            toast.error("Failed to delete item");
        }
    };

    // --- DATA GROUPING ---
    const processedData = useMemo(() =>
    {
        if (!items) return [];
        const filtered = items.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()));

        if (viewMode === 'BRANCH')
        {
            // Group by Branch Name
            return filtered.reduce((acc, item) =>
            {
                const bName = item.branchName || 'Unknown Branch';
                if (!acc[bName]) acc[bName] = [];
                acc[bName].push(item);
                return acc;
            }, {});
        } else
        {
            // Group by Item Name (Batch View)
            const groups = filtered.reduce((acc, item) =>
            {
                if (!acc[item.name])
                {
                    acc[item.name] = {
                        name: item.name,
                        price: item.price,
                        categoryName: item.categoryName || 'Uncategorized',
                        ids: [],
                        branches: [],
                        count: 0
                    };
                }
                acc[item.name].ids.push(item.id);
                acc[item.name].branches.push({
                    name: item.branchName,
                    branchId: item.branchId,
                    price: item.price // Track price variance if needed
                });
                acc[item.name].count++;
                return acc;
            }, {});
            return Object.values(groups);
        }
    }, [items, searchTerm, viewMode]);

    // --- CARD COMPONENT ---
    const ItemCard = ({ item }) =>
    {
        const isBatch = viewMode === 'ITEM';
        return (
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition relative group">
                <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center text-orange-600">
                            {getCategoryIcon(item.categoryName)}
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-800">{item.name}</h3>
                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                                {item.categoryName}
                            </span>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="font-bold text-gray-900 flex items-center justify-end gap-1">
                            <span className="text-xs text-gray-400">$</span>{item.price}
                        </div>
                        {item.prepTime && (
                            <div className="text-xs text-gray-400 flex items-center justify-end gap-1">
                                <Clock size={10} /> {item.prepTime}m
                            </div>
                        )}
                    </div>
                </div>

                {isBatch && (
                    <div className="mt-3 pt-3 border-t border-gray-50 text-xs text-gray-500">
                        <div className="flex items-center gap-1 mb-1">
                            <MapPin size={12} className="text-gray-400" />
                            <span className="font-medium">{item.count} Locations</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                            {item.branches.slice(0, 3).map((b, i) => (
                                <span key={i} className="px-1.5 py-0.5 bg-gray-50 border rounded text-[10px]">{b.name}</span>
                            ))}
                            {item.branches.length > 3 && <span className="px-1.5 py-0.5 bg-gray-50 border rounded text-[10px]">+{item.branches.length - 3}</span>}
                        </div>
                    </div>
                )}

                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                    <button onClick={() => setEditingItem(item)} className="p-1.5 bg-blue-50 text-blue-600 rounded hover:bg-blue-100"><Edit2 size={14} /></button>
                    <button onClick={() => handleDelete(item)} className="p-1.5 bg-red-50 text-red-600 rounded hover:bg-red-100"><Trash2 size={14} /></button>
                </div>
            </div>
        );
    };

    return (
        <div className="p-6 max-w-7xl mx-auto min-h-screen">
            {/* HEADER */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Menu Items</h2>
                    <p className="text-gray-500 text-sm mb-4">Manage food and drinks</p>
                    <div className="inline-flex bg-gray-100 p-1 rounded-lg">
                        <button onClick={() => setViewMode('ITEM')} className={clsx("px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition", { "bg-white shadow-sm": viewMode === 'ITEM', "text-gray-500": viewMode !== 'ITEM' })}><Layers size={16} /> By Item</button>
                        <button onClick={() => setViewMode('BRANCH')} className={clsx("px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition", { "bg-white shadow-sm": viewMode === 'BRANCH', "text-gray-500": viewMode !== 'BRANCH' })}><MapPin size={16} /> By Branch</button>
                    </div>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input type="text" placeholder="Search items..." className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 outline-none" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                    </div>
                    <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-orange-600 text-white font-bold hover:bg-orange-700 shadow-md transition whitespace-nowrap"><Plus size={20} /> Add Item</button>
                </div>
            </div>

            {/* CONTENT */}
            {loading ? <div className="text-center p-12 text-gray-400">Loading menu...</div> : (
                <>
                    {viewMode === 'ITEM' && (
                        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                            {processedData.map((item, idx) => <ItemCard key={idx} item={item} />)}
                        </div>
                    )}
                    {viewMode === 'BRANCH' && (
                        <div className="space-y-8">
                            {Object.keys(processedData).map(branchName => (
                                <div key={branchName}>
                                    <h3 className="text-lg font-bold text-gray-700 mb-3 flex items-center gap-2 border-b pb-2"><MapPin size={18} className="text-gray-400" /> {branchName}</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                        {processedData[branchName].map(item => <ItemCard key={item.id} item={item} />)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}

            {/* MODALS */}
            {showModal && <ItemModal categories={categories} onClose={() => setShowModal(false)} onSuccess={() => { setShowModal(false); loadData(); }} />}
            {editingItem && <ItemModal item={editingItem} categories={categories} mode={viewMode} onClose={() => setEditingItem(null)} onSuccess={() => { setEditingItem(null); loadData(); }} />}
        </div>
    );
}

// --- UNIFIED MODAL (ADD & EDIT) ---
function ItemModal({ item, categories, mode, onClose, onSuccess })
{
    const { user } = useUserStore();
    const isEdit = !!item;

    // Form State
    const [tab, setTab] = useState('DETAILS');
    const [formData, setFormData] = useState({
        name: item?.name || '',
        price: item?.price || '',
        prepTime: item?.prepTime || 15,
        categoryId: item?.categoryId || '',
        categoryName: item?.categoryName || '',
        instructions: '',
        ingredients: []
    });

    // Branch Selection (Owner Add Mode)
    const [availableBranches, setAvailableBranches] = useState([]);
    const [selectedBranches, setSelectedBranches] = useState([]);
    const [loadingBranches, setLoadingBranches] = useState(false);

    useEffect(() =>
    {
        const loadRecipeData = async (targetItemId) =>
        {
            try
            {
                const data = await getRecipeDetails(targetItemId);
                setFormData(prev => ({
                    ...prev,
                    instructions: data.instructions || '',
                    ingredients: data.ingredients || []
                }));
            } catch (err)
            {
                console.log("No recipe found or failed to load");
            }
        };

        if (isEdit)
        {
            // SCENARIO 1: Single Edit (Manager OR Owner in Branch View)
            // We check if it's NOT batch mode OR if the user is NOT an owner
            if (mode !== 'ITEM' || user.role !== 'OWNER')
            {
                // If in ITEM view, Manager gets a group object without 'id', but with 'ids' array.
                // We grab the first ID from the array if 'id' is missing.
                const targetId = item.id || (item.ids && item.ids[0]);
                if (targetId) loadRecipeData(targetId);
            }
            // SCENARIO 2: Batch Edit (Owner in Item View)
            else if (mode === 'ITEM' && item.ids && item.ids.length > 0)
            {
                loadRecipeData(item.ids[0]);
            }
        }

        // SCENARIO 3: New Item (Owner Context needs Branches)
        else if (user.role === 'OWNER')
        {
            setLoadingBranches(true);
            api.get('/branches').then(res =>
            {
                setAvailableBranches(res.data || []);
                if (res.data) setSelectedBranches(res.data.map(b => b.id));
            }).finally(() => setLoadingBranches(false));
        }
    }, [isEdit, item, mode, user.role]);

    const handleSubmit = async (e) =>
    {
        e.preventDefault();
        try
        {
            if (!isEdit)
            {
                // --- CREATE ---
                const payload = {
                    name: formData.name,
                    price: parseFloat(formData.price),
                    prepTime: parseInt(formData.prepTime),
                    recipeInstructions: formData.instructions,
                    ingredients: formData.ingredients.map(i => ({ ingredient: i.ingredient, quantity: i.quantity }))
                };

                if (user.role === 'OWNER')
                {
                    // BATCH CREATE
                    if (selectedBranches.length === 0) return toast.error("Select at least one branch");
                    const selectedCat = categories.find(c => c.id === formData.categoryId || c.name === formData.categoryName);
                    if (!selectedCat) return toast.error("Please select a valid category");

                    await createMenuItemBatch({
                        ...payload,
                        categoryName: selectedCat.name,
                        targetBranchIds: selectedBranches
                    });
                } else
                {
                    // SINGLE CREATE
                    await createMenuItemSingle({
                        ...payload,
                        categoryId: formData.categoryId
                    });
                }
                toast.success("Item Created");
            } else
            {
                // --- EDIT ---

                // 🛑 FIX: Only run Batch Logic if user is OWNER AND in Item Mode
                const isBatchOperation = user.role === 'OWNER' && mode === 'ITEM';

                if (isBatchOperation)
                {
                    // BATCH EDIT
                    await updateMenuItemBatch({
                        name: item.name,
                        updates: { name: formData.name, price: parseFloat(formData.price) },
                        targetBranchIds: item.branches.map(b => b.branchId)
                    });

                    // Only update recipe if tab was visited or data exists
                    if (formData.instructions || formData.ingredients.length > 0)
                    {
                        await updateRecipeBatch({
                            itemName: item.name,
                            targetBranchIds: item.branches.map(b => b.branchId),
                            newInstructions: formData.instructions,
                            newIngredients: formData.ingredients.map(i => ({ ingredient: i.ingredient, quantity: i.quantity }))
                        });
                    }
                    toast.success(`Updated ${item.name} in ${item.branches.length} locations`);
                } else
                {
                    // SINGLE EDIT (Managers Fallback Here)

                    // If Manager is in 'ITEM' view, item is a group object. We need the specific ID.
                    // Since Managers only see 1 branch, items.ids[0] is the correct ID.
                    const targetId = item.id || (item.ids && item.ids[0]);

                    if (!targetId) return toast.error("Cannot find item ID for update");

                    await updateMenuItemDetails(targetId, {
                        name: formData.name,
                        price: parseFloat(formData.price),
                        prepTime: parseInt(formData.prepTime)
                    });

                    await updateRecipeSingle(targetId, {
                        instructions: formData.instructions,
                        replaceAllIngredients: formData.ingredients.map(i => ({ ingredient: i.ingredient, quantity: i.quantity }))
                    });
                    toast.success("Item Updated");
                }
            }
            onSuccess();
        } catch (err)
        {
            console.error(err);
            toast.error(err.response?.data?.error || "Operation failed");
        }
    };

    // Ingredient Helpers
    const addIngredient = () => setFormData(prev => ({ ...prev, ingredients: [...prev.ingredients, { ingredient: '', quantity: '' }] }));
    const updateIngredient = (idx, field, val) =>
    {
        const newIngs = [...formData.ingredients];
        newIngs[idx][field] = val;
        setFormData({ ...formData, ingredients: newIngs });
    };
    const removeIngredient = (idx) =>
    {
        const newIngs = formData.ingredients.filter((_, i) => i !== idx);
        setFormData({ ...formData, ingredients: newIngs });
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center p-6 border-b">
                    <h2 className="text-xl font-bold text-gray-800">{isEdit ? `Edit ${item.name}` : 'New Menu Item'}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
                </div>

                {/* TABS */}
                <div className="flex border-b bg-gray-50/50">
                    <button onClick={() => setTab('DETAILS')} className={clsx("flex-1 py-3 text-sm font-bold border-b-2 transition", tab === 'DETAILS' ? "border-orange-500 text-orange-600 bg-white" : "border-transparent text-gray-500")}>Details</button>
                    <button onClick={() => setTab('RECIPE')} className={clsx("flex-1 py-3 text-sm font-bold border-b-2 transition", tab === 'RECIPE' ? "border-orange-500 text-orange-600 bg-white" : "border-transparent text-gray-500")}>Recipe</button>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
                    {tab === 'DETAILS' && (
                        <div className="space-y-5">
                            {/* Warning for Batch Mode (Only show if Owner) */}
                            {isEdit && mode === 'ITEM' && user.role === 'OWNER' && (
                                <div className="bg-blue-50 text-blue-700 p-3 rounded-lg text-xs flex gap-2 items-center border border-blue-100">
                                    <Layers size={14} />
                                    <span>You are editing this item across <strong>{item.count} locations</strong>. Changes will apply to all.</span>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Item Name</label>
                                    <input required className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Price ($)</label>
                                    <input type="number" step="0.01" required className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none" value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Category</label>
                                    <select
                                        className="w-full p-2 border rounded-lg bg-white focus:ring-2 focus:ring-orange-500 outline-none"
                                        value={formData.categoryId || formData.categoryName}
                                        onChange={e =>
                                        {
                                            const val = e.target.value;
                                            const cat = categories.find(c => c.id === val || c.name === val);
                                            setFormData({ ...formData, categoryId: cat?.id, categoryName: cat?.name });
                                        }}
                                        // Disable change if Owner in Batch mode (moves not supported here yet)
                                        disabled={isEdit && mode === 'ITEM' && user.role === 'OWNER'}
                                    >
                                        <option value="">Select Category...</option>
                                        {[...new Map(categories.map(c => [c.name, c])).values()].map(c => (
                                            <option key={c.id} value={user.role === 'OWNER' ? c.name : c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Prep Time (min)</label>
                                    <input type="number" className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none" value={formData.prepTime} onChange={e => setFormData({ ...formData, prepTime: e.target.value })} />
                                </div>
                            </div>

                            {/* OWNER CREATE BRANCH SELECT */}
                            {!isEdit && user.role === 'OWNER' && (
                                <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                                    <h4 className="font-bold text-sm mb-2 flex items-center gap-2"><MapPin size={16} /> Available in Branches</h4>
                                    {loadingBranches ? <p className="text-xs text-gray-400">Loading branches...</p> : (
                                        <div className="max-h-32 overflow-y-auto grid grid-cols-2 gap-2">
                                            {availableBranches.map(b => (
                                                <label key={b.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-white p-1 rounded">
                                                    <input type="checkbox" checked={selectedBranches.includes(b.id)} onChange={() =>
                                                    {
                                                        if (selectedBranches.includes(b.id)) setSelectedBranches(prev => prev.filter(id => id !== b.id));
                                                        else setSelectedBranches(prev => [...prev, b.id]);
                                                    }} className="text-orange-600 rounded focus:ring-orange-500" />
                                                    {b.name}
                                                </label>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {tab === 'RECIPE' && (
                        <div className="space-y-4">
                            {/* Only warn owner about batch overwrites */}
                            {isEdit && mode === 'ITEM' && user.role === 'OWNER' && (
                                <div className="text-xs text-orange-600 bg-orange-50 p-2 rounded border border-orange-100 mb-2">
                                    Note: Editing the recipe here will <strong>overwrite</strong> the recipe for this item in all {item.count} branches.
                                </div>
                            )}
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Cooking Instructions</label>
                                <textarea
                                    className="w-full p-3 border rounded-lg h-24 text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                                    placeholder="e.g. 1. Grill patty. 2. Toast buns..."
                                    value={formData.instructions}
                                    onChange={e => setFormData({ ...formData, instructions: e.target.value })}
                                />
                            </div>

                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="block text-xs font-bold text-gray-500 uppercase">Ingredients</label>
                                    <button type="button" onClick={addIngredient} className="text-xs flex items-center gap-1 text-orange-600 font-bold hover:bg-orange-50 px-2 py-1 rounded transition">
                                        <Plus size={14} /> Add Ingredient
                                    </button>
                                </div>
                                <div className="space-y-2 max-h-48 overflow-y-auto bg-gray-50 p-3 rounded-lg border">
                                    {formData.ingredients.length === 0 && <p className="text-center text-gray-400 text-xs py-4">No ingredients added.</p>}
                                    {formData.ingredients.map((ing, idx) => (
                                        <div key={idx} className="flex gap-2 items-center">
                                            <div className="flex-1">
                                                <input placeholder="Item (e.g. Beef)" className="w-full p-2 border rounded text-sm focus:ring-2 focus:ring-orange-500 outline-none" value={ing.ingredient} onChange={e => updateIngredient(idx, 'ingredient', e.target.value)} />
                                            </div>
                                            <div className="w-24">
                                                <input placeholder="Qty" className="w-full p-2 border rounded text-sm focus:ring-2 focus:ring-orange-500 outline-none" value={ing.quantity} onChange={e => updateIngredient(idx, 'quantity', e.target.value)} />
                                            </div>
                                            <button type="button" onClick={() => removeIngredient(idx)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition"><Trash2 size={16} /></button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </form>

                <div className="p-6 border-t flex justify-end gap-3 bg-gray-50 rounded-b-xl">
                    <button onClick={onClose} className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 font-semibold hover:bg-gray-100 transition">Cancel</button>
                    <button onClick={handleSubmit} className="px-6 py-2 bg-orange-600 text-white rounded-lg font-bold hover:bg-orange-700 shadow-md transition transform active:scale-95">
                        {isEdit ? 'Save Changes' : 'Create Item'}
                    </button>
                </div>
            </div>
        </div>
    );
}