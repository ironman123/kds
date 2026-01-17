// src/orders/orderRepository.js
import db from "../db.js";

/* ============================================================
   READ OPERATIONS
============================================================ */

export async function getOrderByIdRepo(orderId, branchId)
{
  const row = await db('orders')
    .where({ id: orderId, branch_id: branchId }) // 🛡️ Security: Scope to branch
    .whereNull('deleted_at') // 🛡️ Sync: Ignore deleted rows
    .first();

  return row ? mapRowToOrder(row) : null;
}

export async function getOrdersForTableRepo(tableId)
{
  const rows = await db('orders')
    .where({ table_id: tableId })
    .whereNull('deleted_at')
    .orderBy('created_at', 'desc');

  return rows.map(mapRowToOrder);
}

export async function getActiveOrdersRepo(branchId)
{
  // "Active" means not Completed and not Cancelled
  const rows = await db('orders')
    .where({ branch_id: branchId })
    .whereNull('deleted_at')
    .whereNotIn('status', ['COMPLETED', 'CANCELLED'])
    .orderBy('created_at', 'asc');

  return rows.map(mapRowToOrder);
}

// 🛡️ LOGIC: Used to prevent closing a table if food is still being cooked.
export async function countUnservedItemsForTable(tableId)
{
  const result = await db('order_items')
    .join('orders', 'order_items.order_id', 'orders.id')
    .where('orders.table_id', tableId)
    .whereNull('orders.deleted_at')      // Ignore items from deleted orders
    .whereNull('order_items.deleted_at') // Ignore deleted items
    // We count items that are NOT Served and NOT Cancelled.
    // i.e., Pending, Cooking, or Ready.
    .whereNotIn('order_items.status', ['SERVED', 'CANCELLED'])
    .count('order_items.id as count')
    .first();

  return result.count || 0;
}

/* ============================================================
   WRITE OPERATIONS
============================================================ */

export async function insertOrder(order)
{
  await db('orders').insert({
    id: order.id,
    table_id: order.tableId,
    waiter_id: order.waiterId,
    status: order.status,
    serve_policy: order.servePolicy, // 'TOGETHER' or 'AS_READY'
    customer_name: order.customerName,
    customer_phone: order.customerPhone,
    branch_id: order.branchId,
    created_at: order.createdAt,
    updated_at: order.updatedAt,
    deleted_at: null // ✅ SYNC: Explicitly active
  });
}

export async function updateOrderStatus(orderId, newStatus)
{
  await db('orders')
    .where({ id: orderId })
    .update({
      status: newStatus,
      updated_at: Date.now() // ✅ SYNC: Mark as dirty
    });
}

// 🆕 Feature: Update Waiter (e.g., Shift change)
export async function updateOrderWaiter(orderId, newWaiterId)
{
  await db('orders')
    .where({ id: orderId })
    .update({
      waiter_id: newWaiterId,
      updated_at: Date.now() // ✅ SYNC
    });
}

// 🆕 Feature: Update Customer Info (e.g., Typo fix)
export async function updateOrderCustomerInfo(orderId, name, phone)
{
  const updates = { updated_at: Date.now() };
  if (name !== undefined) updates.customer_name = name;
  if (phone !== undefined) updates.customer_phone = phone;

  await db('orders')
    .where({ id: orderId })
    .update(updates);
}

// 🗑️ Soft Delete (Use carefully, e.g. for accidental "Test" orders)
export async function deleteOrderRepo(orderId)
{
  await db('orders')
    .where({ id: orderId })
    .update({
      deleted_at: Date.now(), // ✅ SYNC: Soft Delete
      updated_at: Date.now()
    });
}

/* ============================================================
   HELPER
============================================================ */
function mapRowToOrder(row)
{
  return {
    id: row.id,
    tableId: row.table_id,
    waiterId: row.waiter_id,
    status: row.status,
    servePolicy: row.serve_policy,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    branchId: row.branch_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at
  };
}