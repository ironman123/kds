import { getOrderByIdRepo } from "./orderRepository.js";
import { getItemsForOrder } from "./orderItemRepository.js";
import { deriveOrderState } from "./deriveOrderState.js";

export function getOrderWithDerivedState(orderId)
{
    const order = getOrderByIdRepo(orderId);
    if (!order) return null;

    const items = getItemsForOrder(orderId);

    const derivedStatus = deriveOrderState(
        items,
        order.serve_policy
    );

    return {
        ...order,
        status: derivedStatus,
        items,
    };
}
