import crypto from "crypto";
import { insertOrderItem } from "./orderItemRepository.js";
import { getOrderItemById, updateOrderItemStatus } from "./orderItemRepository.js";
import { ORDER_ITEM_STATUS } from "./orderItemStates.js";
import { ALLOWED_ITEM_TRANSITIONS } from "./orderItemTransitions.js";
import { logOrderItemEvent } from "./orderItemEventRepository.js";

//import { reevaluateOrderState } from "./orderService.js";

import { deriveOrderState } from "./deriveOrderState.js";
import { updateOrderStatus, getOrderByIdRepo } from "./orderRepository.js";
import { logOrderEvent } from "./orderEventRepository.js";
import { countUnservedItemsForTable } from "./orderRepository.js";
import { markTableFree } from "../tables/tableService.js";

import { assertStaffRole } from "../staff/staffService.js";
import { STAFF_ROLE } from "../staff/staffRoles.js"

export function addItemToOrder({ orderId, menuItemId, quantity, notes = "", actorId })
{
    assertStaffRole(actorId, [STAFF_ROLE.CAPTAIN, STAFF_ROLE.WAITER]);

    const order = getOrderByIdRepo(orderId);
    if (!order)
    {
        throw new Error("Order not found");
    }

    if (order.status !== "PLACED")
    {
        throw new Error("Cannot modify order after it enters preparation");
    }

    if (quantity <= 0)
    {
        throw new Error("Quantity must be greater than zero");
    }

    const item = {
        id: crypto.randomUUID(),
        orderId,
        menuItemId,
        quantity,
        notes,
    };

    insertOrderItem(item);
    return item;
}

export function changeOrderItemStatus({ itemId, newStatus, actorId })
{
    assertStaffRole(actorId, [STAFF_ROLE.OWNER, STAFF_ROLE.CAPTAIN, STAFF_ROLE.KITCHEN]);

    const item = getOrderItemById(itemId);
    if (!item)
    {
        throw new Error("Order item not found");
    }

    const allowed = ALLOWED_ITEM_TRANSITIONS[item.status];

    if (!allowed.includes(newStatus))
    {
        throw new Error(
            `Invalid item transition ${item.status} → ${newStatus}`
        );
    }

    const now = Date.now();

    // --- status-specific timestamps ---
    let startedAt = item.started_at;
    let completedAt = item.completed_at;

    if (newStatus === "PREPARING" && !startedAt)
    {
        startedAt = now;
    }

    if (newStatus === "READY" && !completedAt)
    {
        completedAt = now;
    }

    updateOrderItemStatus(itemId, newStatus, startedAt, completedAt);

    logOrderItemEvent({
        id: crypto.randomUUID(),
        orderId: item.order_id,
        type: "ITEM_STATUS_CHANGED",
        oldValue: item.status,
        newValue: newStatus,
        actorId,
        createdAt: now,
    });

    //reevaluateOrderState(item.order_id, actorId);
    const newOrderStatus = deriveOrderState(item.order_id);
    const order = getOrderByIdRepo(item.order_id);

    console.log("After status change:", itemId, " : ", newOrderStatus);
    if (order.status !== newOrderStatus)
    {
        updateOrderStatus(order.id, newOrderStatus);

        logOrderEvent({
            id: crypto.randomUUID(),
            orderId: order.id,
            type: "ORDER_STATUS_DERIVED",
            oldValue: order.status,
            newValue: newOrderStatus,
            actorId,
            createdAt: Date.now(),
        });

        // If order completed → maybe free table
        if (newOrderStatus === "COMPLETED")
        {
            const remainingItems = countUnservedItemsForTable(order.table_id);

            console.log("Remaining unserved items:", remainingItems);

            if (remainingItems === 0)
            {
                console.log("Setting table free");
                markTableFree(order.table_id);
            }
        }
    }
}