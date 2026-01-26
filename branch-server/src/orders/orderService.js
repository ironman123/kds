import crypto from "crypto";
import { ORDER_STATUS } from "./orderStates.js";
import { ALLOWED_TRANSITIONS } from "./orderTransitions.js";
import
{
    insertOrder,
    getOrderByIdRepo,
    getOrdersForTableRepo,
    updateOrderStatus,
    getActiveOrdersRepo,
    updateOrderWaiter,
    deleteOrderRepo
} from "./orderRepository.js";
import { logOrderEvent } from "./orderEventRepository.js";
import { assertBranchExists } from "../infra/branchService.js";
import
{
    STAFF_ROLE, assertStaffRole
} from "../staff/staffRoles.js";
import { countItemsForOrder } from "./orderItemRepository.js";
import { markTableOccupied, markTableFree, assertTableFree } from '../tables/tableService.js';

/* ============================================================
   PRIVATE HELPER
============================================================ */
async function getOrderOrThrow(orderId, branchId)
{
    const order = await getOrderByIdRepo(orderId, branchId);
    if (!order)
    {
        throw new Error("Order not found in this branch");
    }
    return order;
}

/* ============================================================
   CREATE
============================================================ */

export async function createOrder({ tableId, waiterId, servePolicy = "PARTIAL", customerName = null, customerPhone = null, branchId, actorId })
{
    const now = Date.now();
    const orderId = crypto.randomUUID();

    if (!branchId) throw new Error("Branch ID is required");
    await assertBranchExists(branchId);

    // 1. Security: Only Waiters, Captains, Managers, Owners can create orders
    //await assertStaffRole(actorId, [STAFF_ROLE.WAITER, STAFF_ROLE.CAPTAIN, STAFF_ROLE.MANAGER, STAFF_ROLE.OWNER]);

    // 2. Logic: Ensure Table is actually free
    await assertTableFree(tableId, branchId);

    const order = {
        id: orderId,
        tableId,
        waiterId,
        status: ORDER_STATUS.PLACED,
        servePolicy,
        createdAt: now,
        updatedAt: now,
        customerName,
        customerPhone,
        branchId,
    };

    // 3. DB Transaction (Implicit via async calls)
    await insertOrder(order);
    await markTableOccupied(tableId, branchId, actorId);

    // 4. Log Event (Sync)
    await logOrderEvent({
        id: crypto.randomUUID(),
        branchId, // ✅ SYNC: Critical
        orderId,
        type: "CREATED",
        oldValue: null,
        newValue: ORDER_STATUS.PLACED,
        actorId: actorId || waiterId,
        createdAt: now,
    });

    return order;
}

/* ============================================================
   READ
============================================================ */

export async function getOrderById(orderId, branchId)
{
    // Security: branchId is mandatory to prevent cross-branch data leaks
    if (!branchId) throw new Error("Branch ID required");

    const order = await getOrderByIdRepo(orderId, branchId);
    if (!order) return null;

    const itemCount = await countItemsForOrder(order.id);

    return {
        ...order,
        itemCount
    };
}

export async function getActiveOrders(branchId)
{
    if (!branchId) throw new Error("Branch ID is required");

    const orders = await getActiveOrdersRepo(branchId);

    // Enrich with item counts (Parallel efficiency)
    const enrichedOrders = await Promise.all(orders.map(async (order) => ({
        ...order,
        itemCount: await countItemsForOrder(order.id)
    })));

    return enrichedOrders;
}

export async function getOrdersForTable(tableId, branchId)
{
    // Note: Usually we don't strictly need branchId if tableId is unique, 
    // but strictly passing it is good security practice.
    const orders = await getOrdersForTableRepo(tableId);

    return Promise.all(orders.map(async (order) => ({
        ...order,
        itemCount: await countItemsForOrder(order.id)
    })));
}

/* ============================================================
   STATE MANAGEMENT (Update)
============================================================ */

export async function changeOrderStatus({ orderId, newStatus, branchId, actorId })
{
    await assertBranchExists(branchId);

    // 1. Fetch Order
    const order = await getOrderOrThrow(orderId, branchId);

    if (order.status === newStatus) return order;

    // 2. Security Checks
    // - Managers/Owners can do anything.
    // - Waiters/Captains can move PLACED -> PREPARING -> READY -> SERVED.
    // - Kitchen (Chef) can move PLACED -> PREPARING -> READY.
    // - Only Managers/Owners can CANCEL or COMPLETE (Payments).
    if ([ORDER_STATUS.COMPLETED, ORDER_STATUS.CANCELLED].includes(newStatus))
    {
        await assertStaffRole(actorId, [STAFF_ROLE.MANAGER, STAFF_ROLE.OWNER, STAFF_ROLE.CAPTAIN]);
    } else
    {
        // General staff check for other statuses
        await assertStaffRole(actorId, [
            STAFF_ROLE.WAITER, STAFF_ROLE.CAPTAIN,
            STAFF_ROLE.MANAGER, STAFF_ROLE.OWNER, STAFF_ROLE.KITCHEN
        ]);
    }

    // 3. Transition Validation
    const allowed = ALLOWED_TRANSITIONS[order.status];
    if (!allowed || !allowed.includes(newStatus))
    {
        throw new Error(`Invalid Order Transition: '${order.status}' -> '${newStatus}'`);
    }

    // 4. Update DB
    await updateOrderStatus(orderId, newStatus);

    // 5. Side Effects: Free Table if closing order
    if (newStatus === ORDER_STATUS.COMPLETED || newStatus === ORDER_STATUS.CANCELLED)
    {
        await markTableFree(order.tableId, branchId, actorId);
    }

    // 6. Log
    await logOrderEvent({
        id: crypto.randomUUID(),
        branchId, // ✅ SYNC
        orderId,
        type: "STATUS_CHANGED",
        oldValue: order.status,
        newValue: newStatus,
        actorId,
        createdAt: Date.now()
    });

    return { ...order, status: newStatus };
}

// Helper for re-assigning waiter
export async function transferTable({ orderId, newWaiterId, branchId, actorId })
{
    await assertStaffRole(actorId, [STAFF_ROLE.MANAGER, STAFF_ROLE.OWNER, STAFF_ROLE.CAPTAIN]);

    const order = await getOrderOrThrow(orderId, branchId);

    await updateOrderWaiter(orderId, newWaiterId);

    await logOrderEvent({
        id: crypto.randomUUID(),
        branchId,
        orderId,
        type: "WAITER_TRANSFERRED",
        oldValue: order.waiterId,
        newValue: newWaiterId,
        actorId,
        createdAt: Date.now()
    });

    return { ...order, waiterId: newWaiterId };
}