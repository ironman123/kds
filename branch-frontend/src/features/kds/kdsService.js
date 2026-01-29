import { getActiveOrdersRepo } from "../orders/orderRepository.js";

export const buildKdsView = async (branchId) =>
{
    // 1. Fetch all active orders (not completed/cancelled)
    const orders = await getActiveOrdersRepo(branchId);

    // 2. Initialize Columns
    const view = {
        newOrders: [],
        preparing: [],
        ready: [],
        stats: {
            urgentCount: 0,
            totalActive: orders.length
        }
    };

    // 3. Sort and Group
    const now = Date.now();
    const URGENT_THRESHOLD_MS = 10 * 60 * 1000; // 10 Minutes

    orders.forEach(order =>
    {
        // Calculate urgency
        const elapsed = now - order.createdAt;
        const isUrgent = elapsed > URGENT_THRESHOLD_MS;

        if (isUrgent) view.stats.urgentCount++;

        const kdsOrder = {
            ...order,
            isUrgent,
            elapsedMinutes: Math.floor(elapsed / 60000)
        };

        // Group by Status
        switch (order.status)
        {
            case 'PLACED':
                view.newOrders.push(kdsOrder);
                break;
            case 'PREPARING':
                view.preparing.push(kdsOrder);
                break;
            case 'READY':
                view.ready.push(kdsOrder);
                break;
            default:
                // SERVED or CANCELLED are ignored in KDS usually
                break;
        }
    });

    return view;
};