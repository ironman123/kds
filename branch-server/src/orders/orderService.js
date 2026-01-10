import crypto from "crypto";
import { ORDER_STATUS } from "./orderStates.js";
import { ALLOWED_TRANSITIONS } from "./orderTransitions.js";
import { insertOrder, getOrderByIdRepo, getOrdersForTableRepo, updateOrderStatus, getActiveOrdersRepo } from "./orderRepository.js";
import { logOrderEvent } from "./orderEventRepository.js";

import { countItemsForOrder } from "./orderItemRepository.js";

import { markTableOccupied, markTableFree, assertTableFree } from '../tables/tableService.js';

//import { getOrderItemsForOrder } from "./orderItemRepository.js";
import { deriveOrderState } from "./deriveOrderState.js";

export function createOrder({ tableId, waiterId, servePolicy = "PARTIAL", customerName = null, customerPhone = null })
{
    const now = Date.now();
    const orderId = crypto.randomUUID();
    assertTableFree(tableId);
    const order = {
        id: orderId,
        tableId,
        waiterId,
        status: ORDER_STATUS.PLACED,
        servePolicy,
        createdAt: now,
        updatedAt: now,
        customerName,
        customerPhone
    };

    insertOrder(order);
    markTableOccupied(tableId);

    logOrderEvent({
        id: crypto.randomUUID(),
        orderId,
        type: "CREATED",
        oldValue: null,
        newValue: ORDER_STATUS.PLACED,
        actorId: waiterId,
        createdAt: now,
    });

    return order;
}

export function getOrderById(orderId)
{
    const order = getOrderByIdRepo(orderId);
    if (!order) return null;

    return {
        ...order,
        itemCount: countItemsForOrder(order.id),
    };
}

export function getActiveOrders()
{
    const orders = getActiveOrdersRepo();

    return orders.map(order => ({
        ...order,
        itemCount: countItemsForOrder(order.id),
    }));
}

export function getOrdersForTable(tableId)
{
    const orders = getOrdersForTableRepo(tableId);

    return orders.map(order => ({
        ...order,
        itemCount: countItemsForOrder(order.id),
    }));
}


// export function reevaluateOrderState(orderId, actorId)
// {
//     const order = getOrderById(orderId);
//     if (!order) return;

//     const items = getOrderItemsForOrder(orderId);

//     const nextState = deriveOrderState({
//         items,
//         servePolicy: order.serve_policy,
//     });

//     if (nextState !== order.status)
//     {
//         updateOrderStatus(orderId, nextState);

//         logOrderEvent({
//             id: crypto.randomUUID(),
//             orderId,
//             type: "STATUS_CHANGED",
//             oldValue: order.status,
//             newValue: nextState,
//             actorId,
//             createdAt: Date.now(),
//         });

//         // Free table only when completed
//         if (nextState === ORDER_STATUS.COMPLETED)
//         {
//             const activeOrders = countActiveOrdersForTable(order.table_id);
//             if (activeOrders === 0)
//             {
//                 markTableFree(order.table_id);
//             }
//         }
//     }
// }

// export function changeOrderStatus({ orderId, newStatus, actorId })
// {
//     const order = getOrderById(orderId);
//     if (!order)
//     {
//         throw new Error("Order not found");
//     }

//     const allowed = ALLOWED_TRANSITIONS[order.status] || [];
//     if (!allowed.includes(newStatus))
//     {
//         throw new Error(
//             `Invalid transition from ${order.status} to ${newStatus}`
//         );
//     }

//     const now = Date.now();

//     updateOrderStatus(orderId, newStatus, now);

//     if (order.status === "PLACED" && newStatus === "PREPARING")
//     {
//         const itemCount = countItemsForOrder(orderId);
//         if (itemCount === 0)
//         {
//             throw new Error("Cannot start preparing an empty order");
//         }
//     }


//     if (newStatus === "SERVED")
//     {
//         const remaining = countActiveOrdersForTable(order.table_id);
//         if (remaining === 0)
//         {
//             markTableFree(order.table_id);
//         }
//     }

//     logOrderEvent({
//         id: crypto.randomUUID(),
//         orderId,
//         type: "STATUS_CHANGED",
//         oldValue: order.status,
//         newValue: newStatus,
//         actorId,
//         createdAt: now,
//     });
// }
