import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
// 👇 Import updateItemStatus
import { getOrderById, addItemToOrder, changeOrderStatus, updateItemStatus } from './orderService';
import { getCategories } from '../menu/menuService';
import { getMenuItems } from '../menu/menuItemService';
import toast from 'react-hot-toast';
import
{
    ShoppingCart, Plus, ChefHat, CheckCircle, ArrowLeft,
    Search, X, Minus, MessageSquare, Trash2
} from 'lucide-react';
import clsx from 'clsx';

export default function OrderInterface()
{
    const { orderId } = useParams();
    const navigate = useNavigate();

    // Data State
    const [order, setOrder] = useState(null);
    const [categories, setCategories] = useState([]);
    const [menuItems, setMenuItems] = useState([]);

    // UI State
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState('ALL');
    const [searchQuery, setSearchQuery] = useState('');

    // Modal State
    const [selectedItem, setSelectedItem] = useState(null);
    const [itemQuantity, setItemQuantity] = useState(1);
    const [itemNotes, setItemNotes] = useState('');
    const [isAdding, setIsAdding] = useState(false);

    useEffect(() =>
    {
        loadData();
    }, [orderId]);

    const loadData = async () =>
    {
        try
        {
            const [orderData, catData, itemData] = await Promise.all([
                getOrderById(orderId),
                getCategories(), // Ensure this matches your export name (listCategories vs getCategories)
                getMenuItems()   // Ensure this matches your export name
            ]);
            setOrder(orderData);
            setCategories(catData);
            setMenuItems(itemData);
        } catch (err)
        {
            console.error(err);
            toast.error("Failed to load order data");
            navigate('/dashboard/orders');
        } finally
        {
            setLoading(false);
        }
    };

    // --- LOGIC: FILTERING ---
    const filteredItems = useMemo(() =>
    {
        return menuItems.filter(item =>
        {
            const matchesCategory = selectedCategory === 'ALL' || item.categoryId === selectedCategory;
            const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesCategory && matchesSearch;
        });
    }, [menuItems, selectedCategory, searchQuery]);

    // --- LOGIC: ACTIONS ---
    const openItemModal = (item) =>
    {
        setSelectedItem(item);
        setItemQuantity(1);
        setItemNotes('');
    };

    const closeItemModal = () =>
    {
        setSelectedItem(null);
    };

    const handleConfirmAddItem = async () =>
    {
        if (!selectedItem) return;
        setIsAdding(true);
        try
        {
            await addItemToOrder(orderId, {
                menuItemId: selectedItem.id,
                quantity: itemQuantity,
                notes: itemNotes
            });
            const updatedOrder = await getOrderById(orderId);
            setOrder(updatedOrder);
            toast.success(`Added ${itemQuantity}x ${selectedItem.name}`);
            setSelectedItem(null);
        } catch (err)
        {
            console.error(err);
            toast.error("Failed to add item");
        } finally
        {
            setIsAdding(false);
        }
    };

    const handleSendToKitchen = async () =>
    {
        try
        {
            await changeOrderStatus(orderId, "PREPARING");
            setOrder(prev => ({ ...prev, status: "PREPARING" }));
            toast.success("Order sent to kitchen");
        } catch (err)
        {
            console.error(err);
            toast.error("Failed to update status");
        }
    };

    const handleCompleteOrder = async () =>
    {
        if (!confirm("Finish serving this table? This will clear the table.")) return;
        try
        {
            await changeOrderStatus(orderId, "COMPLETED");
            toast.success("Order Completed");
            navigate('/dashboard/orders');
        } catch (err)
        {
            console.error(err);
            toast.error("Failed to complete order");
        }
    };

    // 👇 NEW: Handle Voiding (Cancellation)
    const handleVoidItem = async (itemId, itemName) =>
    {
        if (!confirm(`Void ${itemName}? This will strike it off the bill.`)) return;
        try
        {
            // Update status to CANCELLED instead of deleting
            await updateItemStatus(itemId, "CANCELLED");

            // Refresh
            const updatedOrder = await getOrderById(orderId);
            setOrder(updatedOrder);
            toast.success("Item voided");
        } catch (err)
        {
            console.error(err);
            toast.error("Failed to void item");
        }
    };

    if (loading) return <div className="flex items-center justify-center h-screen text-gray-400">Loading POS...</div>;
    if (!order) return <div className="flex items-center justify-center h-screen text-red-500">Order not found</div>;

    return (
        <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-gray-50 relative">

            {/* LEFT: MENU AREA */}
            <div className="flex-1 flex flex-col border-r border-gray-200 overflow-hidden">
                {/* Header: Back + Search */}
                <div className="bg-white border-b shrink-0 p-4 space-y-4">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <button onClick={() => navigate('/dashboard/orders')} className="p-2 hover:bg-gray-100 rounded-full text-gray-500">
                                <ArrowLeft size={20} />
                            </button>
                            <h2 className="font-bold text-lg text-gray-800">Menu</h2>
                        </div>

                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                            <input
                                className="w-full pl-10 pr-4 py-2 bg-gray-100 border-transparent focus:bg-white focus:ring-2 focus:ring-yellow-500 focus:border-transparent rounded-lg outline-none transition text-sm"
                                placeholder="Search items..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                            {searchQuery && (
                                <button onClick={() => setSearchQuery('')} className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600">
                                    <X size={16} />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Category Tabs */}
                    <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                        <button onClick={() => setSelectedCategory('ALL')} className={clsx("px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition border", selectedCategory === 'ALL' ? "bg-yellow-600 text-white border-yellow-600" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50")}>
                            All Items
                        </button>
                        {categories.map(cat => (
                            <button key={cat.id} onClick={() => setSelectedCategory(cat.id)} className={clsx("px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition border", selectedCategory === cat.id ? "bg-yellow-600 text-white border-yellow-600" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50")}>
                                {cat.name}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Items Grid */}
                <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {filteredItems.map(item => (
                            <div key={item.id} onClick={() => openItemModal(item)} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm cursor-pointer hover:border-yellow-300 hover:shadow-md transition group relative flex flex-col items-center text-center h-44 justify-center">
                                <div className="text-4xl mb-3">🍔</div>
                                <h4 className="font-bold text-gray-800 text-sm leading-tight line-clamp-2">{item.name}</h4>
                                <p className="text-yellow-600 font-bold mt-2 text-sm">${item.price}</p>
                                <div className="absolute inset-0 bg-yellow-600/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl backdrop-blur-[1px]">
                                    <span className="bg-white text-yellow-600 px-3 py-1 rounded-full text-xs font-bold shadow-md border border-yellow-100">Add +</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* RIGHT: ORDER CART */}
            <div className="w-96 bg-white flex flex-col shadow-xl z-10 border-l border-gray-200">
                <div className="p-5 border-b bg-white">
                    <div className="flex justify-between items-start mb-1">
                        <h3 className="font-bold text-xl text-gray-800">Order #{order.id.slice(0, 4)}</h3>
                        <span className={clsx("text-[10px] px-2 py-1 rounded font-bold uppercase tracking-wide", order.status === 'PLACED' ? "bg-blue-100 text-blue-700" : order.status === 'PREPARING' ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700")}>
                            {order.status}
                        </span>
                    </div>
                    <p className="text-sm text-gray-500 font-medium">
                        {order.customerName ? `Guest: ${order.customerName}` : 'Walk-in Customer'}
                    </p>
                </div>

                {/* Cart Items List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {order.items && order.items.length > 0 ? (
                        order.items.map((item, index) =>
                        {
                            const menuItem = menuItems.find(m => m.id === item.menuItemId);
                            const itemName = menuItem ? menuItem.name : 'Unknown Item';
                            const itemPrice = menuItem ? menuItem.price : 0;
                            const isCancelled = item.status === 'CANCELLED'; // Check status

                            return (
                                <div
                                    key={index}
                                    className={clsx(
                                        "flex flex-col p-3 rounded-lg border transition group",
                                        // Visual style for Cancelled items
                                        isCancelled
                                            ? "bg-red-50/50 border-red-100 opacity-60"
                                            : "bg-gray-50/50 border-gray-100 hover:bg-white hover:shadow-sm"
                                    )}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <div className="flex items-center gap-3">
                                            {/* Quantity */}
                                            <div className={clsx(
                                                "w-7 h-7 rounded-md border flex items-center justify-center font-bold text-xs shadow-sm",
                                                isCancelled ? "bg-red-100 border-red-200 text-red-400" : "bg-white border-gray-200 text-gray-700"
                                            )}>
                                                {item.quantity}x
                                            </div>

                                            {/* Name & Price */}
                                            <div>
                                                <div className={clsx(
                                                    "font-bold text-sm",
                                                    isCancelled ? "text-red-400 line-through decoration-2 decoration-red-300" : "text-gray-800"
                                                )}>
                                                    {itemName}
                                                </div>
                                                <div className={clsx("text-xs", isCancelled ? "text-red-300 line-through" : "text-gray-400")}>
                                                    ${itemPrice * item.quantity}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {/* Status Badge */}
                                            <span className={clsx(
                                                "text-[9px] uppercase font-bold px-1.5 py-0.5 rounded",
                                                item.status === 'READY' ? "bg-green-100 text-green-700" :
                                                    item.status === 'PREPARING' ? "bg-yellow-100 text-yellow-700" :
                                                        item.status === 'CANCELLED' ? "bg-red-100 text-red-600" : // Style for cancelled badge
                                                            "bg-gray-200 text-gray-500"
                                            )}>
                                                {item.status}
                                            </span>

                                            {/* Void Button (Only if PENDING) */}
                                            {item.status === 'PENDING' && (
                                                <button
                                                    onClick={() => handleVoidItem(item.id, itemName)}
                                                    className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition opacity-100 group-hover/item:opacity-100"
                                                    title="Void Item"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Notes */}
                                    {item.notes && (
                                        <div className={clsx(
                                            "ml-10 text-[10px] flex items-start gap-1 italic",
                                            isCancelled ? "text-red-300 line-through" : "text-gray-500"
                                        )}>
                                            <MessageSquare size={10} className="mt-0.5" />
                                            "{item.notes}"
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    ) : (
                        <div className="flex flex-col items-center justify-center h-64 text-gray-300">
                            <ShoppingCart size={64} className="mb-4 opacity-20" />
                            <p className="text-sm">No items yet</p>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="p-4 border-t bg-gray-50 space-y-3">
                    <div className="flex justify-between items-center text-sm px-1">
                        <span className="text-gray-500">Total Items</span>
                        {/* Filter out Cancelled items from count */}
                        <span className="font-bold text-gray-800">
                            {order.items?.filter(i => i.status !== 'CANCELLED').length || 0}
                        </span>
                    </div>

                    <button
                        onClick={handleSendToKitchen}
                        disabled={order.status !== 'PLACED'}
                        className={clsx(
                            "w-full font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition shadow-sm",
                            order.status === 'PLACED' ? "bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md" : "bg-gray-200 text-gray-400 cursor-not-allowed"
                        )}
                    >
                        <ChefHat size={18} />
                        {order.status === 'PLACED' ? "Send to Kitchen" : "Sent to Kitchen"}
                    </button>

                    <button onClick={handleCompleteOrder} className="w-full bg-green-600 text-white font-bold py-3 rounded-xl hover:bg-green-700 flex items-center justify-center gap-2 transition shadow-sm hover:shadow-md">
                        <CheckCircle size={18} /> Settle & Close
                    </button>
                </div>
            </div>

            {/* --- ADD ITEM MODAL --- */}
            {selectedItem && (
                <div className="absolute inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-5 border-b bg-gray-50 flex justify-between items-center">
                            <div>
                                <h3 className="font-bold text-lg text-gray-800">{selectedItem.name}</h3>
                                <p className="text-yellow-600 font-bold">${selectedItem.price}</p>
                            </div>
                            <button onClick={closeItemModal} className="p-1 rounded-full hover:bg-gray-200 text-gray-500 transition">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-6">
                            <div className="flex items-center justify-center gap-6">
                                <button onClick={() => setItemQuantity(Math.max(1, itemQuantity - 1))} className="w-12 h-12 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-100 hover:border-gray-300 transition">
                                    <Minus size={24} />
                                </button>
                                <span className="text-3xl font-bold text-gray-800 w-12 text-center">{itemQuantity}</span>
                                <button onClick={() => setItemQuantity(itemQuantity + 1)} className="w-12 h-12 rounded-full bg-yellow-600 text-white flex items-center justify-center hover:bg-yellow-700 shadow-md transition">
                                    <Plus size={24} />
                                </button>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1">Special Instructions</label>
                                <textarea className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-yellow-500 outline-none text-sm bg-gray-50 resize-none" rows={3} placeholder="e.g. No onions, extra spicy..." value={itemNotes} onChange={e => setItemNotes(e.target.value)} />
                            </div>
                            <button onClick={handleConfirmAddItem} disabled={isAdding} className="w-full bg-yellow-600 text-white font-bold py-3.5 rounded-xl hover:bg-yellow-700 shadow-md hover:shadow-lg transition flex justify-center items-center gap-2">
                                {isAdding ? "Adding..." : (<><span>Add to Order</span><span className="bg-yellow-700/50 px-2 py-0.5 rounded text-sm">${selectedItem.price * itemQuantity}</span></>)}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}