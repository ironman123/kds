import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { createOrder } from './orderService';
import useUserStore from '../../store/userStore';
import toast from 'react-hot-toast';
import { User, Phone, FileText, ArrowRight } from 'lucide-react';

export default function CreateOrder()
{
    const { tableId } = useParams();
    const { user } = useUserStore();
    const navigate = useNavigate();

    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [notes, setNotes] = useState('');
    const [servePolicy, setServePolicy] = useState('PARTIAL');
    const [loading, setLoading] = useState(false);

    const handleCreate = async (e) =>
    {
        e.preventDefault();
        setLoading(true);

        try
        {
            const order = await createOrder({
                tableId,
                waiterId: user.id,
                customerName: customerName || `Table Guest`,
                customerPhone: customerPhone,
                notes: notes,
                servePolicy,
                branchId: user.branchId
            });

            if (order && order.id)
            {
                toast.success("Order started!");
                // 1. Log ID for debugging
                console.log("Order Created:", order.id);
                navigate(`/dashboard/orders/${order.id}`);
            } else
            {
                throw new Error("Invalid order response");
            }

        } catch (err)
        {
            console.error(err);
            toast.error(err.response?.data?.error || "Failed to start order");
        } finally
        {
            setLoading(false);
        }
    };

    // ... rest of your UI remains the same
    return (
        <div className="p-6 max-w-md mx-auto">
            {/* ... form content ... */}
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Start New Order</h2>

            <form onSubmit={handleCreate} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-5">

                {/* Customer Name */}
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Customer Name</label>
                    <div className="relative">
                        <User className="absolute left-3 top-2.5 text-gray-400" size={18} />
                        <input
                            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-yellow-400 outline-none text-sm"
                            placeholder="e.g. John Doe (Optional)"
                            value={customerName}
                            onChange={e => setCustomerName(e.target.value)}
                        />
                    </div>
                </div>

                {/* Phone Number */}
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Phone Number</label>
                    <div className="relative">
                        <Phone className="absolute left-3 top-2.5 text-gray-400" size={18} />
                        <input
                            type="tel"
                            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-yellow-400 outline-none text-sm"
                            placeholder="e.g. 9876543210 (Optional)"
                            value={customerPhone}
                            onChange={e => setCustomerPhone(e.target.value)}
                        />
                    </div>
                </div>

                {/* Order Notes */}
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">General Notes</label>
                    <div className="relative">
                        <FileText className="absolute left-3 top-2.5 text-gray-400" size={18} />
                        <textarea
                            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-yellow-400 outline-none text-sm resize-none"
                            rows="2"
                            placeholder="e.g. VIP, Allergies, Special Request..."
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
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
                            className={`p-3 rounded-lg border text-sm font-semibold transition ${servePolicy === 'PARTIAL' ? 'bg-yellow-50 border-yellow-400 text-yellow-700' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'}`}
                        >
                            Standard
                            <span className="block text-[10px] font-normal opacity-75 mt-0.5">Serve items as ready</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setServePolicy('ALL_AT_ONCE')}
                            className={`p-3 rounded-lg border text-sm font-semibold transition ${servePolicy === 'ALL_AT_ONCE' ? 'bg-yellow-50 border-yellow-400 text-yellow-700' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'}`}
                        >
                            All Together
                            <span className="block text-[10px] font-normal opacity-75 mt-0.5">Wait for everything</span>
                        </button>
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-yellow-500 text-white font-bold py-3 rounded-lg hover:bg-yellow-600 transition flex items-center justify-center gap-2 shadow-sm"
                >
                    {loading ? "Starting Order..." : <>Start Order <ArrowRight size={18} /></>}
                </button>
            </form>
        </div>
    );
}