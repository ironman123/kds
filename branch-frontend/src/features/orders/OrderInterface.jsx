import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getOrderById, addItemToOrder, changeOrderStatus } from './orderService';
import { getCategories } from '../menu/menuService';
import { getMenuItems } from '../menu/menuItemService';
import toast from 'react-hot-toast';
import { ShoppingCart, Plus, ChefHat, CheckCircle, ArrowLeft } from 'lucide-react';
import clsx from 'clsx';

export default function OrderInterface()
{
    const { orderId } = useParams();
    const navigate = useNavigate();

    // Data State
    const [order, setOrder] = useState(null);
    const [categories, setCategories] = useState([]);
    const [menuItems, setMenuItems] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('ALL');

    // UI State
    const [loading, setLoading] = useState(true);
    const [addingItemId, setAddingItemId] = useState(null);

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
                getCategories(),
                getMenuItems()
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

    const handleAddItem = async (item) =>
    {
        setAddingItemId(item.id);
        try
        {
            await addItemToOrder(orderId, {
                menuItemId: item.id,
                quantity: 1,
                notes: ''
            });

            // Refresh order data to show new item
            const updatedOrder = await getOrderById(orderId);
            setOrder(updatedOrder);

            toast.success(`Added ${item.name}`);
        } catch (err)
        {
            console.error(err);
            toast.error("Failed to add item");
        } finally
        {
            setAddingItemId(null);
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

    // Filter Items
    const filteredItems = selectedCategory === 'ALL'
        ? menuItems
        : menuItems.filter(i => i.categoryId === selectedCategory);

    if (loading) return <div className="flex items-center justify-center h-screen text-gray-400">Loading POS...</div>;
    if (!order) return <div className="flex items-center justify-center h-screen text-red-500">Order not found</div>;

    return (
        <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-gray-50">
            {/* LEFT: MENU AREA */}
            <div className="flex-1 flex flex-col border-r border-gray-200 overflow-hidden">

                {/* Header / Tabs */}
                <div className="bg-white border-b shrink-0">
                    <div className="p-4 flex items-center gap-4">
                        <button onClick={() => navigate('/dashboard/orders')} className="p-2 hover:bg-gray-100 rounded-full text-gray-500">
                            <ArrowLeft size={20} />
                        </button>
                        <h2 className="font-bold text-lg text-gray-800">Menu</h2>
                    </div>

                    <div className="flex gap-2 px-4 pb-4 overflow-x-auto scrollbar-hide">
                        <button
                            onClick={() => setSelectedCategory('ALL')}
                            className={clsx(
                                "px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition",
                                selectedCategory === 'ALL' ? "bg-orange-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            )}
                        >
                            All Items
                        </button>
                        {categories.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setSelectedCategory(cat.id)}
                                className={clsx(
                                    "px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition",
                                    selectedCategory === cat.id ? "bg-orange-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                )}
                            >
                                {cat.name}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Items Grid */}
                <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {filteredItems.map(item => (
                            <div
                                key={item.id}
                                onClick={() => !addingItemId && handleAddItem(item)}
                                className={clsx(
                                    "bg-white p-4 rounded-xl border border-gray-100 shadow-sm cursor-pointer hover:border-orange-300 hover:shadow-md transition group relative flex flex-col items-center text-center h-40 justify-center",
                                    addingItemId === item.id ? "opacity-70 pointer-events-none" : ""
                                )}
                            >
                                <div className="text-3xl mb-3">🍔</div>
                                <h4 className="font-bold text-gray-800 text-sm leading-tight line-clamp-2">{item.name}</h4>
                                <p className="text-orange-600 font-bold mt-2 text-sm">${item.price}</p>

                                {/* Hover Overlay */}
                                <div className="absolute inset-0 bg-orange-600/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl">
                                    <Plus className="bg-orange-600 text-white p-2 rounded-full shadow-lg" size={28} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* RIGHT: ORDER CART */}
            <div className="w-96 bg-white flex flex-col shadow-xl z-20 border-l border-gray-200">
                <div className="p-5 border-b bg-white">
                    <div className="flex justify-between items-start mb-1">
                        <h3 className="font-bold text-xl text-gray-800">Order #{order.id.slice(0, 4)}</h3>
                        <span className={clsx(
                            "text-[10px] px-2 py-1 rounded font-bold uppercase tracking-wide",
                            order.status === 'PLACED' ? "bg-blue-100 text-blue-700" :
                                order.status === 'PREPARING' ? "bg-yellow-100 text-yellow-700" :
                                    "bg-green-100 text-green-700"
                        )}>
                            {order.status}
                        </span>
                    </div>
                    <p className="text-sm text-gray-500 font-medium">
                        {order.customerName ? `Guest: ${order.customerName}` : 'Walk-in Customer'}
                    </p>
                </div>

                {/* Cart Items List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-1">
                    {order.items && order.items.length > 0 ? (
                        order.items.map((item, index) =>
                        {
                            // Find item name from menuItems list to display correctly
                            const menuItem = menuItems.find(m => m.id === item.menuItemId);
                            const itemName = menuItem ? menuItem.name : 'Unknown Item';
                            const itemPrice = menuItem ? menuItem.price : 0;

                            return (
                                <div key={index} className="flex justify-between items-center p-3 rounded-lg hover:bg-gray-50 transition border border-transparent hover:border-gray-100">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-600 text-sm">
                                            {item.quantity}x
                                        </div>
                                        <div>
                                            <div className="font-bold text-gray-800 text-sm">{itemName}</div>
                                            <div className="text-xs text-gray-400 mt-0.5">${itemPrice}</div>
                                        </div>
                                    </div>
                                    <span className={clsx(
                                        "text-[10px] uppercase font-bold px-2 py-1 rounded",
                                        item.status === 'READY' ? "bg-green-100 text-green-700" :
                                            item.status === 'PREPARING' ? "bg-yellow-100 text-yellow-700" :
                                                "bg-gray-100 text-gray-500"
                                    )}>
                                        {item.status}
                                    </span>
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
                        <span className="font-bold text-gray-800">{order.items?.length || 0}</span>
                    </div>

                    <button
                        onClick={handleSendToKitchen}
                        disabled={order.status !== 'PLACED'}
                        className={clsx(
                            "w-full font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition shadow-sm",
                            order.status === 'PLACED'
                                ? "bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md"
                                : "bg-gray-200 text-gray-400 cursor-not-allowed"
                        )}
                    >
                        <ChefHat size={18} />
                        {order.status === 'PLACED' ? "Send to Kitchen" : "Sent to Kitchen"}
                    </button>

                    <button
                        onClick={handleCompleteOrder}
                        className="w-full bg-green-600 text-white font-bold py-3 rounded-xl hover:bg-green-700 flex items-center justify-center gap-2 transition shadow-sm hover:shadow-md"
                    >
                        <CheckCircle size={18} /> Settle & Close
                    </button>
                </div>
            </div>
        </div>
    );
}