import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { createOrder } from './orderService';
import useUserStore from '../../store/userStore';
import toast from 'react-hot-toast';
import { Users, User, ArrowRight } from 'lucide-react';

export default function CreateOrder()
{
    const { tableId } = useParams();
    const { user } = useUserStore();
    const navigate = useNavigate();

    const [customerName, setCustomerName] = useState('');
    const [servePolicy, setServePolicy] = useState('PARTIAL'); // Default standard flow
    const [loading, setLoading] = useState(false);

    const handleCreate = async (e) =>
    {
        e.preventDefault();
        setLoading(true);

        try
        {
            const order = await createOrder({
                tableId,
                waiterId: user.id, // Current logged in user is the waiter
                customerName: customerName || `Table Guest`, // Default name if empty
                servePolicy,
                branchId: user.branchId
            });

            toast.success("Order started!");
            // Redirect to the Order Details/Menu screen
            navigate(`/dashboard/orders/${order.id}`);
        } catch (err)
        {
            toast.error(err.response?.data?.error || "Failed to start order");
        } finally
        {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 max-w-md mx-auto">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Start New Order</h2>

            <form onSubmit={handleCreate} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-5">

                {/* Customer Name */}
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Customer Name / Reference</label>
                    <div className="relative">
                        <User className="absolute left-3 top-2.5 text-gray-400" size={18} />
                        <input
                            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                            placeholder="e.g. John Doe (or leave blank)"
                            value={customerName}
                            onChange={e => setCustomerName(e.target.value)}
                        />
                    </div>
                </div>

                {/* Service Policy */}
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Service Style</label>
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            type="button"
                            onClick={() => setServePolicy('PARTIAL')}
                            className={`p-3 rounded-lg border text-sm font-semibold transition ${servePolicy === 'PARTIAL' ? 'bg-orange-50 border-orange-500 text-orange-700' : 'bg-gray-50 border-gray-200 text-gray-600'}`}
                        >
                            Standard
                            <span className="block text-[10px] font-normal opacity-75 mt-1">Serve items as they get ready</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setServePolicy('ALL_AT_ONCE')}
                            className={`p-3 rounded-lg border text-sm font-semibold transition ${servePolicy === 'ALL_AT_ONCE' ? 'bg-orange-50 border-orange-500 text-orange-700' : 'bg-gray-50 border-gray-200 text-gray-600'}`}
                        >
                            All Together
                            <span className="block text-[10px] font-normal opacity-75 mt-1">Wait until everything is ready</span>
                        </button>
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-orange-600 text-white font-bold py-3 rounded-lg hover:bg-orange-700 transition flex items-center justify-center gap-2"
                >
                    {loading ? "Creating..." : <>Start Order <ArrowRight size={18} /></>}
                </button>
            </form>
        </div>
    );
}