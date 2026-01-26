import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listTables } from '../tables/tableService'; // Reuse table service
import { getOrdersForTable } from './orderService';
import { LayoutGrid, Users, Clock } from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';

export default function TableSelection()
{
    const navigate = useNavigate();
    const [tables, setTables] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() =>
    {
        loadFloorPlan();
    }, []);

    const loadFloorPlan = async () =>
    {
        try
        {
            const data = await listTables();
            setTables(data);
        } catch (err)
        {
            toast.error("Failed to load tables");
        } finally
        {
            setLoading(false);
        }
    };

    const handleTableClick = async (table) =>
    {
        if (table.status === 'OCCUPIED')
        {
            // If occupied, find the active order and go to it
            try
            {
                const orders = await getOrdersForTable(table.id);
                // Assume the first non-completed order is the active one
                const activeOrder = orders.find(o => o.status !== 'COMPLETED' && o.status !== 'CANCELLED');

                if (activeOrder)
                {
                    navigate(`/dashboard/orders/${activeOrder.id}`);
                } else
                {
                    // Edge case: Table says occupied but no active order found (sync issue?)
                    // For now, let's treat it as free or show error
                    toast.error("Table is occupied but no active order found.");
                }
            } catch (err)
            {
                toast.error("Failed to fetch active order");
            }
        } else
        {
            // If free, go to "Create Order" screen for this table
            navigate(`/dashboard/orders/new/${table.id}`);
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <LayoutGrid className="text-orange-600" /> Select a Table
            </h2>

            {loading ? (
                <div className="text-center py-12 text-gray-400">Loading floor plan...</div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {tables.map(table => (
                        <div
                            key={table.id}
                            onClick={() => handleTableClick(table)}
                            className={clsx(
                                "p-6 rounded-xl border-2 cursor-pointer transition-all hover:shadow-md relative overflow-hidden group",
                                table.status === 'FREE' ? "bg-white border-green-100 hover:border-green-300" :
                                    table.status === 'OCCUPIED' ? "bg-red-50 border-red-200" :
                                        "bg-yellow-50 border-yellow-200"
                            )}
                        >
                            <div className="flex justify-between items-start">
                                <h3 className="text-xl font-black text-gray-800">{table.label}</h3>
                                {table.status === 'OCCUPIED' && <Users size={18} className="text-red-400" />}
                            </div>

                            <div className="mt-4">
                                <span className={clsx(
                                    "text-xs font-bold uppercase tracking-wider px-2 py-1 rounded",
                                    table.status === 'FREE' ? "bg-green-100 text-green-700" :
                                        table.status === 'OCCUPIED' ? "bg-red-100 text-red-700" :
                                            "bg-yellow-100 text-yellow-700"
                                )}>
                                    {table.status}
                                </span>
                            </div>

                            {table.status === 'FREE' && (
                                <div className="absolute inset-0 bg-green-500/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <span className="bg-white text-green-700 px-3 py-1 rounded-full text-xs font-bold shadow-sm">
                                        Start Order
                                    </span>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}