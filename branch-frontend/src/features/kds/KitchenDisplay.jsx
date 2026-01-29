import { useState, useEffect, useMemo } from 'react';
import api from '../../api/client';
import { ChefHat, CheckCircle, Clock, AlertTriangle, Flame } from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';

export default function KitchenDisplay()
{
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    // Poll KDS Data
    useEffect(() =>
    {
        fetchKds();
        const interval = setInterval(fetchKds, 5000); // 5s Poll for real-time feel
        return () => clearInterval(interval);
    }, []);

    const fetchKds = async () =>
    {
        try
        {
            const res = await api.get('/kds/view');
            setOrders(res.data.orders);
        } catch (err)
        {
            console.error("KDS Load Error", err);
        } finally
        {
            setLoading(false);
        }
    };

    // Optimistic UI updates for individual items
    const handleItemAction = async (orderId, itemId, currentStatus) =>
    {
        // Determine next status
        let nextStatus = 'PREPARING';
        if (currentStatus === 'PREPARING') nextStatus = 'READY';
        if (currentStatus === 'READY') return; // Cannot move beyond ready here (Waiters serve)

        try
        {
            // Optimistic Update
            setOrders(prev => prev.map(o =>
            {
                if (o.orderId !== orderId) return o;
                return {
                    ...o,
                    items: o.items.map(i => i.orderItemId === itemId ? { ...i, status: nextStatus } : i)
                };
            }));

            // API Call
            await api.patch(`/orders/items/${itemId}/status`, { newStatus: nextStatus });
            toast.success(nextStatus === 'PREPARING' ? "Cooking..." : "Item Ready!");

            // Re-fetch to sync full state (e.g. moving columns)
            setTimeout(fetchKds, 500);
        } catch (err)
        {
            toast.error("Failed to update item");
            fetchKds(); // Revert on error
        }
    };

    // Columns Logic
    const columns = useMemo(() => ({
        new: orders.filter(o => o.status === 'PENDING'),
        preparing: orders.filter(o => o.status === 'PREPARING'),
        ready: orders.filter(o => o.status === 'READY')
    }), [orders]);

    if (loading) return <div className="p-10 text-center text-gray-400">Loading Kitchen System...</div>;

    return (
        <div className="h-[calc(100vh-64px)] bg-gray-50 flex overflow-hidden p-4 gap-4">
            <KdsColumn title="New Orders" color="yellow" orders={columns.new} onItemClick={handleItemAction} />
            <KdsColumn title="Preparing" color="blue" orders={columns.preparing} onItemClick={handleItemAction} />
            <KdsColumn title="Ready" color="green" orders={columns.ready} onItemClick={handleItemAction} />
        </div>
    );
}

// --- Sub Components ---

function KdsColumn({ title, color, orders, onItemClick })
{
    const colors = {
        yellow: "bg-yellow-400 border-yellow-500 text-yellow-900",
        blue: "bg-blue-500 border-blue-600 text-white",
        green: "bg-green-500 border-green-600 text-white"
    };

    return (
        <div className="flex-1 flex flex-col min-w-[320px] max-w-md bg-gray-100 rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Header */}
            <div className={clsx("p-3 font-bold flex justify-between items-center border-b-4", colors[color])}>
                <span>{title}</span>
                <span className="bg-black/20 px-2 py-0.5 rounded text-sm">{orders.length}</span>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-hide">
                {orders.map(order => (
                    <OrderTicket key={order.orderId} order={order} onItemClick={onItemClick} />
                ))}
                {orders.length === 0 && <div className="text-center text-gray-400 mt-10">No orders</div>}
            </div>
        </div>
    );
}

function OrderTicket({ order, onItemClick })
{
    // Heat Styling
    const borderColors = {
        GREEN: "border-l-gray-300",
        YELLOW: "border-l-yellow-400",
        ORANGE: "border-l-orange-500",
        RED: "border-l-red-600 animate-pulse-slow" // Custom animation class needed or use simple pulse
    };

    return (
        <div className={clsx(
            "bg-white rounded-lg shadow-sm border border-gray-200 border-l-4 p-3 relative",
            borderColors[order.heat] || "border-l-gray-300",
            order.pulse && "ring-2 ring-red-400 ring-offset-1"
        )}>
            {/* Urgent Badge */}
            {order.heat === 'RED' && (
                <div className="absolute -top-2 -right-2 bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-sm flex items-center gap-1">
                    <AlertTriangle size={10} /> {order.elapsedMins}m
                </div>
            )}

            {/* Header */}
            <div className="flex justify-between items-start mb-3 border-b border-gray-50 pb-2">
                <div>
                    <h3 className="font-black text-lg text-gray-800">#{order.orderId.slice(0, 4)}</h3>
                    <p className="text-sm font-semibold text-gray-500">{order.tableLabel}</p>
                </div>
                <div className="flex items-center gap-1 text-xs font-mono text-gray-400 bg-gray-50 px-1.5 py-1 rounded">
                    <Clock size={12} /> {order.elapsedMins}m
                </div>
            </div>

            {/* Items */}
            <div className="space-y-2">
                {order.items.map(item => (
                    <div
                        key={item.orderItemId}
                        onClick={() => onItemClick(order.orderId, item.orderItemId, item.status)}
                        className={clsx(
                            "flex items-start gap-3 p-2 rounded cursor-pointer transition select-none",
                            // Status specific background
                            item.status === 'READY' ? "bg-green-50 border border-green-100" :
                                item.status === 'PREPARING' ? "bg-blue-50 border border-blue-100" :
                                    "bg-gray-50 hover:bg-gray-100"
                        )}
                    >
                        {/* Checkbox Icon */}
                        <div className={clsx(
                            "mt-0.5 w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-colors",
                            item.status === 'READY' ? "bg-green-500 border-green-500 text-white" :
                                item.status === 'PREPARING' ? "bg-blue-500 border-blue-500 text-white" :
                                    "bg-white border-gray-300"
                        )}>
                            {item.status === 'READY' && <CheckCircle size={14} />}
                            {item.status === 'PREPARING' && <ChefHat size={14} />}
                        </div>

                        <div className="flex-1">
                            <div className={clsx("text-sm font-bold leading-tight", item.status === 'READY' ? "text-green-800 line-through opacity-70" : "text-gray-800")}>
                                {item.quantity}x {item.name}
                            </div>
                            {item.note && <div className="text-[10px] text-red-500 font-medium mt-0.5 italic">Note: {item.note}</div>}
                        </div>
                    </div>
                ))}
            </div>

            {/* Footer */}
            {order.note && (
                <div className="mt-3 bg-yellow-50 text-yellow-800 text-xs p-2 rounded border border-yellow-100 italic">
                    Order Note: {order.note}
                </div>
            )}
        </div>
    );
}