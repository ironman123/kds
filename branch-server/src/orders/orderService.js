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
// 👇 IMPORT getItemsForOrder HERE
import { countItemsForOrder, getItemsForOrder } from "./orderItemRepository.js";
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

export async function createOrder({ tableId, waiterId, servePolicy = "PARTIAL", customerName = null, customerPhone = null, branchId, actorId, notes })
{
    const now = Date.now();
    const orderId = crypto.randomUUID();

    if (!branchId) throw new Error("Branch ID is required");
    await assertBranchExists(branchId);

    // 2. Logic: Ensure Table is actually free
    await assertTableFree(tableId, branchId);

    const order = {
        id: orderId,
        tableId,
        waiterId,
        status: ORDER_STATUS.PLACED,
        servePolicy,
        createdAt: now,
        notes: notes,
        updatedAt: now,
        customerName,
        customerPhone,
        branchId,
    };

    await insertOrder(order);
    await markTableOccupied(tableId, branchId, actorId);

    await logOrderEvent({
        id: crypto.randomUUID(),
        branchId,
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
   READ (FIXED)
============================================================ */

export async function getOrderById(orderId, branchId)
{
    if (!branchId) throw new Error("Branch ID required");

    const order = await getOrderByIdRepo(orderId, branchId);
    if (!order) return null;

    // 👇 FIX: Fetch the actual list of items
    const items = await getItemsForOrder(order.id);

    return {
        ...order,
        items, // <--- Front-end needs this array!
        itemCount: items.length
    };
}

export async function getActiveOrders(branchId)
{
    if (!branchId) throw new Error("Branch ID is required");

    const orders = await getActiveOrdersRepo(branchId);

    // Enrich with item counts
    const enrichedOrders = await Promise.all(orders.map(async (order) => ({
        ...order,
        itemCount: await countItemsForOrder(order.id)
    })));

    return enrichedOrders;
}

export async function getOrdersForTable(tableId, branchId)
{
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

    const order = await getOrderOrThrow(orderId, branchId);

    if (order.status === newStatus) return order;

    if ([ORDER_STATUS.COMPLETED, ORDER_STATUS.CANCELLED].includes(newStatus))
    {
        await assertStaffRole(actorId, [STAFF_ROLE.MANAGER, STAFF_ROLE.OWNER, STAFF_ROLE.CAPTAIN]);
    } else
    {
        await assertStaffRole(actorId, [
            STAFF_ROLE.WAITER, STAFF_ROLE.CAPTAIN,
            STAFF_ROLE.MANAGER, STAFF_ROLE.OWNER, STAFF_ROLE.KITCHEN
        ]);
    }

    const allowed = ALLOWED_TRANSITIONS[order.status];
    if (!allowed || !allowed.includes(newStatus))
    {
        throw new Error(`Invalid Order Transition: '${order.status}' -> '${newStatus}'`);
    }

    await updateOrderStatus(orderId, newStatus);

    if (newStatus === ORDER_STATUS.COMPLETED || newStatus === ORDER_STATUS.CANCELLED)
    {
        await markTableFree(order.tableId, branchId, actorId);
    }

    await logOrderEvent({
        id: crypto.randomUUID(),
        branchId,
        orderId,
        type: "STATUS_CHANGED",
        oldValue: order.status,
        newValue: newStatus,
        actorId,
        createdAt: Date.now()
    });

    return { ...order, status: newStatus };
}

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