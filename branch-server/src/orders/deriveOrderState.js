import { getOrderByIdRepo } from "./orderRepository.js"; // 👈 Fix: Use Repo, not Service
import { getItemsForOrder } from "./orderItemRepository.js";
import { ORDER_STATUS } from "./orderStates.js";
import { ORDER_ITEM_STATUS } from "./orderItemStates.js";

export async function deriveOrderState(orderId)
{
    const order = await getOrderByIdRepo(orderId);
    if (!order) throw new Error("Order not found");

    const items = await getItemsForOrder(orderId);

    // Filter out CANCELLED items (they shouldn't block the order state)
    const activeItems = items.filter(i => i.status !== ORDER_ITEM_STATUS.CANCELLED);

    // If all items were cancelled, the order is cancelled
    if (items.length > 0 && activeItems.length === 0)
    {
        return ORDER_STATUS.CANCELLED;
    }

    if (activeItems.length === 0) return ORDER_STATUS.PLACED;

    const statuses = activeItems.map(i => i.status);
    const all = s => statuses.every(x => x === s);
    const any = s => statuses.some(x => x === s);

    // 1️⃣ All active items SERVED → COMPLETED
    // (The system auto-closes the order so the table becomes free)
    if (all(ORDER_ITEM_STATUS.SERVED))
    {
        return ORDER_STATUS.COMPLETED;
    }

    // 2️⃣ ALL_AT_ONCE logic (Wait until everything is ready)
    if (order.servePolicy === "ALL_AT_ONCE")
    {
        if (all(ORDER_ITEM_STATUS.READY))
        {
            return ORDER_STATUS.READY;
        }

        if (any(ORDER_ITEM_STATUS.PREPARING) || any(ORDER_ITEM_STATUS.READY))
        {
            return ORDER_STATUS.PREPARING;
        }

        return ORDER_STATUS.PLACED;
    }

    // 3️⃣ PARTIAL logic (Standard Restaurant Flow)
    // If food is on the pass (READY), the order is effectively "Ready" for a runner
    if (any(ORDER_ITEM_STATUS.READY)) 
    {
        return ORDER_STATUS.READY;
    }

    if (any(ORDER_ITEM_STATUS.PREPARING))
    {
        return ORDER_STATUS.PREPARING;
    }

    return ORDER_STATUS.PLACED;
}