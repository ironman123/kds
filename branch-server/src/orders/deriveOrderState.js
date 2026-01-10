import { getOrderById } from "./orderService.js";
import { getItemsForOrder } from "./orderItemRepository.js";
import { ORDER_STATUS } from "./orderStates.js";

export function deriveOrderState(orderId)
{
    const order = getOrderById(orderId);
    if (!order) throw new Error("Order not found");

    const items = getItemsForOrder(orderId);
    if (items.length === 0) return ORDER_STATUS.PLACED;

    const statuses = items.map(i => i.status);

    const all = s => statuses.every(x => x === s);
    const any = s => statuses.some(x => x === s);

    // 1️⃣ All served → completed
    if (all("SERVED"))
    {
        return ORDER_STATUS.COMPLETED;
    }

    // 2️⃣ ALL_AT_ONCE logic
    if (order.serve_policy === "ALL_AT_ONCE")
    {
        if (all("READY"))
        {
            return ORDER_STATUS.READY;
        }

        if (any("PREPARING") || any("READY"))
        {
            return ORDER_STATUS.PREPARING;
        }

        return ORDER_STATUS.PLACED;
    }

    // 3️⃣ PARTIAL logic
    if (any("PREPARING") || any("READY"))
    {
        return ORDER_STATUS.PREPARING;
    }

    return ORDER_STATUS.PLACED;
}
