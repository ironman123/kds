import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listTables } from '../tables/tableService';
import { getActiveOrders } from './orderService';
import
    {
        LayoutGrid, Users, Clock, ShoppingBag,
        ChefHat, CheckCircle, Utensils, AlertCircle
    } from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';

export default function TableSelection()
{
    const navigate = useNavigate();
    const [tables, setTables] = useState([]);
    const [activeOrders, setActiveOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() =>
    {
        loadData();
        const interval = setInterval(loadData, 30000); // Poll every 30s
        return () => clearInterval(interval);
    }, []);

    const loadData = async () =>
    {
        try
        {
            // Fetch both tables and orders
            const [tablesData, ordersData] = await Promise.all([
                listTables(),
                getActiveOrders()
            ]);
            setTables(tablesData);
            setActiveOrders(ordersData);
        } catch (err)
        {
            console.error(err);
            toast.error("Failed to load floor plan");
        } finally
        {
            setLoading(false);
        }
    };

    // Helper: Find active order for a table
    const getTableOrder = (tableId) =>
    {
        return activeOrders.find(o => o.tableId === tableId);
    };

    const handleTableClick = (table, order) =>
    {
        if (order)
        {
            // Table Occupied -> Go to existing order
            navigate(`/dashboard/orders/${order.id}`);
        } else if (table.status === 'FREE')
        {
            // Table Free -> Start new order
            navigate(`/dashboard/orders/new/${table.id}`);
        } else
        {
            toast.error("Table is reserved or blocked.");
        }
    };

    // Helper: Calculate stats (Pending vs Ready)
    const getItemStats = (order) =>
    {
        if (!order || !order.items) return { pending: 0, ready: 0, total: 0 };
        const pending = order.items.filter(i => i.status === 'PENDING' || i.status === 'PREPARING').length;
        const ready = order.items.filter(i => i.status === 'READY').length;
        return { pending, ready, total: order.items.length };
    };

    if (loading) return <div className="p-10 text-center text-gray-400">Loading Floor Plan...</div>;

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex justify-between items-end mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <LayoutGrid className="text-orange-600" /> Floor Plan
                    </h2>
                    <p className="text-gray-500 text-sm mt-1">Select a table to view or create orders</p>
                </div>

                {/* Legend */}
                <div className="flex gap-4 text-xs font-medium text-gray-600 bg-white px-4 py-2 rounded-full shadow-sm border border-gray-100">
                    <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-green-500"></span> Free</div>
                    <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500"></span> Occupied</div>
                    <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-yellow-500"></span> Reserved</div>
                </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {tables.map(table =>
                {
                    const order = getTableOrder(table.id);
                    const isOccupied = !!order;
                    const stats = getItemStats(order);

                    // Calculate elapsed minutes if occupied
                    const elapsedMins = order ? Math.floor((Date.now() - order.createdAt) / 60000) : 0;

                    return (
                        <div
                            key={table.id}
                            onClick={() => handleTableClick(table, order)}
                            className={clsx(
                                "relative rounded-2xl border-2 transition-all duration-200 cursor-pointer overflow-hidden group hover:shadow-lg bg-white h-48 flex flex-col justify-between",
                                isOccupied ? "border-red-100 hover:border-red-300" :
                                    table.status === 'RESERVED' ? "border-yellow-200" :
                                        "border-green-100 hover:border-green-400"
                            )}
                        >
                            {/* Status Left Stripe */}
                            <div className={clsx(
                                "absolute top-0 left-0 bottom-0 w-1.5",
                                isOccupied ? "bg-red-500" :
                                    table.status === 'RESERVED' ? "bg-yellow-500" :
                                        "bg-green-500"
                            )} />

                            {/* Card Content */}
                            <div className="p-5 pl-7 flex-1 flex flex-col">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="text-xl font-bold text-gray-800">{table.label}</h3>
                                    {isOccupied ? (
                                        <span className="text-[10px] font-bold bg-red-100 text-red-700 px-2 py-1 rounded-full uppercase tracking-wide">Occupied</span>
                                    ) : (
                                        <span className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-1 rounded-full uppercase tracking-wide">Free</span>
                                    )}
                                </div>

                                {isOccupied ? (
                                    <div className="flex-1 flex flex-col justify-between">
                                        <div className="space-y-2">
                                            {/* Guest & Time */}
                                            <div className="flex items-center justify-between text-xs text-gray-500 border-b border-gray-100 pb-2">
                                                <div className="flex items-center gap-1.5 truncate max-w-[65%]">
                                                    <Users size={14} />
                                                    <span className="truncate font-medium">{order.customerName || 'Guest'}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5 font-mono">
                                                    <Clock size={14} />
                                                    <span>{elapsedMins}m</span>
                                                </div>
                                            </div>

                                            {/* Item Stats */}
                                            <div className="flex gap-2">
                                                <div className="flex-1 bg-orange-50 p-1.5 rounded text-center">
                                                    <div className="text-[10px] text-orange-400 font-bold uppercase">Pending</div>
                                                    <div className="text-sm font-bold text-orange-700">{stats.pending}</div>
                                                </div>
                                                <div className="flex-1 bg-green-50 p-1.5 rounded text-center">
                                                    <div className="text-[10px] text-green-400 font-bold uppercase">Ready</div>
                                                    <div className="text-sm font-bold text-green-700">{stats.ready}</div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="text-[10px] text-right text-gray-400 mt-2">
                                            #{order.id.slice(0, 4)} • Total {stats.total} items
                                        </div>
                                    </div>
                                ) : (
                                    /* Empty State */
                                    <div className="flex-1 flex flex-col items-center justify-center text-gray-300 gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                                        <ShoppingBag size={32} strokeWidth={1.5} />
                                        <span className="text-xs font-medium">Tap to start order</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}