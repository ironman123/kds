import crypto from "crypto";
import
{
    insertOrderItem,
    getOrderItemById,
    updateOrderItemStatus
} from "./orderItemRepository.js";
import { ORDER_ITEM_STATUS } from "./orderItemStates.js";
import { ALLOWED_ITEM_TRANSITIONS } from "./orderItemTransitions.js";
import { logOrderItemEvent } from "./orderItemEventRepository.js";

import { deriveOrderState } from "./deriveOrderState.js";
import
{
    updateOrderStatus,
    getOrderByIdRepo,
    countUnservedItemsForTable
} from "./orderRepository.js";
import { logOrderEvent } from "./orderEventRepository.js";
import { markTableFree } from "../tables/tableService.js";

import { assertStaffRole, STAFF_ROLE } from "../staff/staffRoles.js";
import { assertBranchExists } from "../infra/branchService.js";

export async function addItemToOrder({ orderId, menuItemId, quantity, notes = "", actorId, branchId })
{
    // 1. Validation
    if (!branchId) throw new Error("Branch ID required");
    await assertBranchExists(branchId);
    await assertStaffRole(actorId, [STAFF_ROLE.CAPTAIN, STAFF_ROLE.WAITER, STAFF_ROLE.MANAGER, STAFF_ROLE.OWNER]);

    if (quantity <= 0) throw new Error("Quantity must be greater than zero");

    // 2. Fetch Order (Security: Ensure it belongs to this branch)
    const order = await getOrderByIdRepo(orderId, branchId);
    if (!order) throw new Error("Order not found in this branch");

    // 3. Logic: Locking
    if (order.status !== "PLACED" && order.status !== "PREPARING") 
    {
        // Note: Some restaurants allow adding items while 'PREPARING', others don't. 
        // Strict Mode: if (order.status !== "PLACED") throw ...
    }

    const now = Date.now();
    const item = {
        id: crypto.randomUUID(),
        orderId,
        menuItemId,
        quantity,
        notes,
        status: ORDER_ITEM_STATUS.PENDING,
        createdAt: now,
        updatedAt: now
    };

    // 4. Insert
    await insertOrderItem(item);

    // 5. Log (Sync Ready)
    await logOrderItemEvent({
        id: crypto.randomUUID(),
        branchId, // ✅ SYNC
        orderId,
        itemId: item.id,
        type: "ITEM_ADDED",
        oldValue: null,
        newValue: JSON.stringify({ menuItemId, quantity }),
        actorId,
        createdAt: now
    });

    return item;
}

export async function changeOrderItemStatus({ itemId, newStatus, actorId, branchId })
{
    // 1. Validation (Fast checks before starting transaction)
    if (!branchId) throw new Error("Branch ID required");

    await assertStaffRole(actorId, [
        STAFF_ROLE.OWNER, STAFF_ROLE.CAPTAIN,
        STAFF_ROLE.KITCHEN, STAFF_ROLE.MANAGER, STAFF_ROLE.WAITER
    ]);

    // 2. Fetch Item (Needed to validate transitions before locking DB)
    const item = await getOrderItemById(itemId);
    if (!item) throw new Error("Order item not found");

    // 3. Security: Verify Order belongs to Branch
    // We check this early to fail fast if someone is spoofing IDs
    const preCheckOrder = await getOrderByIdRepo(item.orderId, branchId);
    if (!preCheckOrder) throw new Error("Order not found or does not belong to this branch");

    // 4. Transition Check
    const allowed = ALLOWED_ITEM_TRANSITIONS[item.status];
    if (!allowed || !allowed.includes(newStatus))
    {
        throw new Error(`Invalid item transition ${item.status} → ${newStatus}`);
    }

    // START TRANSACTION
    // We wrap all writes to ensure we don't end up with "Item Updated" but "Order Status Old"
    await runInTransaction(async (trx) =>
    {
        // 5. Calculate Timestamps
        const now = Date.now();
        const additionalUpdates = {};

        // If starting prep, set started_at (if not already set)
        if (newStatus === ORDER_ITEM_STATUS.PREPARING && !item.startedAt)
        {
            additionalUpdates.started_at = now;
        }
        // If ready, set completed_at (Chef is done)
        if (newStatus === ORDER_ITEM_STATUS.READY && !item.completedAt)
        {
            additionalUpdates.completed_at = now;
        }

        // 6. Update DB
        // Note: If your repos don't accept 'trx', this relies on the repos using the same global connection context.
        // If using raw Knex, ensure your repos can accept an optional 'trx' argument.
        await updateOrderItemStatus(itemId, newStatus, additionalUpdates);

        // 7. Log (Sync Ready)
        await logOrderItemEvent({
            id: crypto.randomUUID(),
            branchId, // ✅ SYNC
            orderId: item.orderId,
            itemId: itemId,
            type: "ITEM_STATUS_CHANGED",
            oldValue: item.status,
            newValue: newStatus,
            actorId,
            createdAt: now,
        });

        // 8. 🔄 Derivation: Update Parent Order Status
        const newOrderStatus = await deriveOrderState(item.orderId);

        // Re-fetch order inside transaction to ensure we have latest state if needed
        const order = await getOrderByIdRepo(item.orderId, branchId);

        console.log(`[Order Logic] Item ${itemId} -> ${newStatus}. Order ${order.id} is now ${newOrderStatus}`);

        if (order.status !== newOrderStatus)
        {
            await updateOrderStatus(order.id, newOrderStatus);

            await logOrderEvent({
                id: crypto.randomUUID(),
                branchId, // ✅ SYNC
                orderId: order.id,
                type: "ORDER_STATUS_DERIVED",
                oldValue: order.status,
                newValue: newOrderStatus,
                actorId: "SYSTEM", // System derived this change
                createdAt: Date.now(),
            });

            // 9. Auto-Free Table Logic
            // If order became COMPLETED (All served) or CANCELLED (All voided)
            if (newOrderStatus === "COMPLETED" || newOrderStatus === "CANCELLED")
            {
                // Double check: Are there any stragglers? (e.g. one item left pending?)
                const remainingItems = await countUnservedItemsForTable(order.tableId);

                console.log(`[Table Logic] Unserved items on table ${order.tableId}: ${remainingItems}`);

                if (remainingItems === 0)
                {
                    console.log(`[Table Logic] Freeing table ${order.tableId}`);
                    await markTableFree(order.tableId, branchId, "SYSTEM");
                }
            }
        }
    });
}