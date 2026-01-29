/**
 * @typedef {"GREEN"|"YELLOW"|"YELLOW"|"RED"} HeatState
 */

/**
 * @typedef {Object} KdsItemView
 * @property {string} orderItemId
 * @property {string} name
 * @property {number} quantity
 * @property {"PENDING"|"PREPARING"|"READY"} status
 * @property {boolean} isBlocking
 * @property {"NONE"|"WAITING"|"ACTIVE"} hint
 * @property {string|null} notes
 */

/**
 * @typedef {Object} KdsOrderView
 * @property {string} orderId
 * @property {string} tableLabel
 * @property {"PARTIAL"|"ALL_AT_ONCE"} servePolicy
 * @property {HeatState} heat
 * @property {boolean} pulse
 * @property {boolean} blocking
 * @property {string|null} notes
 * @property {KdsItemView[]} items
 */

/**
 * @typedef {Object} KdsView
 * @property {number} generatedAt
 * @property {KdsOrderView[]} orders
 */

import db from "../db.js";

async function fetchRawKdsRows(branchId)
{
    return await db('orders as o')
        .join('order_items as oi', 'oi.order_id', 'o.id')
        .join('menu_items as mi', 'mi.id', 'oi.menu_item_id')
        // Left join tables in case an order has no table (e.g. takeaway)
        .leftJoin('tables as t', 't.id', 'o.table_id')
        .select(
            'o.id as order_id',
            'o.serve_policy',
            'o.created_at as order_created_at',
            'o.notes as order_note',
            't.label as table_label',
            'oi.id as order_item_id',
            'oi.status as item_status',
            'oi.quantity',
            'oi.started_at',
            'oi.completed_at',
            'oi.notes as item_note',
            'mi.name as item_name',
            'mi.prep_time'
        )
        // ✅ Fix 2: Filter by Branch!
        .where('o.branch_id', branchId)
        .whereNot('oi.status', 'COMPLETED')
        .whereNot('oi.status', 'CANCELLED')
        .orderBy('o.created_at', 'asc');
}

// function computeLastProgressAt(order)
// {
//     const completed = order.items
//         .map(i => i.completedAt)
//         .filter(Boolean);

//     if (completed.length > 0)
//     {
//         return Math.max(...completed);
//     }

//     const started = order.items
//         .map(i => i.startedAt)
//         .filter(Boolean);

//     if (started.length > 0)
//     {
//         return Math.min(...started);
//     }

//     return order.createdAt;
// }

// function groupByOrder(rows)
// {
//     const map = new Map();

//     for (const r of rows)
//     {
//         if (!map.has(r.order_id))
//         {
//             map.set(r.order_id, {
//                 orderId: r.order_id,
//                 tableLabel: r.table_label,
//                 servePolicy: r.serve_policy,
//                 createdAt: r.order_created_at,
//                 note: r.order_note,
//                 items: [],
//             });
//         }

//         map.get(r.order_id).items.push({
//             orderItemId: r.order_item_id,
//             name: r.item_name,
//             quantity: r.quantity,
//             status: r.item_status,
//             startedAt: r.started_at,
//             completedAt: r.completed_at,
//             prepTime: r.prep_time,
//             createdAt: r.item_created_at,
//             note: r.item_note,
//         });
//     }

//     return [...map.values()];
// }

function computeWaitingBudget(order)
{
    const totalPrep = order.items
        .map(i => i.prepTime || 0)
        .reduce((a, b) => a + b, 0);

    return Math.max(totalPrep * 60_000 * 1.2, 5 * 60_000);
}


// function computeHeat(now, lastProgressAt, budget)
// {
//     const ratio = (now - lastProgressAt) / budget;
//     if (ratio < 0.5) return "GREEN";
//     if (ratio < 0.8) return "YELLOW";
//     if (ratio < 1.0) return "YELLOW";
//     return "RED";
// }

function computeLastProgressAt(order)
{
    const completed = order.items.map(i => i.completedAt).filter(Boolean);
    if (completed.length > 0) return Math.max(...completed);

    const started = order.items.map(i => i.startedAt).filter(Boolean);
    if (started.length > 0) return Math.min(...started);

    return order.createdAt;
}

function groupByOrder(rows)
{
    const map = new Map();
    for (const r of rows)
    {
        if (!map.has(r.order_id))
        {
            map.set(r.order_id, {
                orderId: r.order_id,
                tableLabel: r.table_label || 'Takeaway',
                servePolicy: r.serve_policy,
                createdAt: r.order_created_at,
                note: r.order_note,
                items: [],
            });
        }
        map.get(r.order_id).items.push({
            orderItemId: r.order_item_id,
            name: r.item_name,
            quantity: r.quantity,
            status: r.item_status,
            startedAt: r.started_at,
            completedAt: r.completed_at,
            prepTime: r.prep_time,
            note: r.item_note,
        });
    }
    return [...map.values()];
}

// function computeWaitingBudget(order)
// {
//     const totalPrep = order.items.map(i => i.prepTime || 0).reduce((a, b) => a + b, 0);
//     // Budget is Prep Time + 5 mins buffer
//     return Math.max(totalPrep * 60000 * 1.2, 5 * 60000);
// }

function computeHeat(now, lastProgressAt, budget)
{
    const ratio = (now - lastProgressAt) / budget;
    if (ratio < 0.5) return "GREEN";
    if (ratio < 0.8) return "YELLOW"; // Getting warm
    if (ratio < 1.0) return "ORANGE"; // Urgent
    return "RED"; // Overdue
}

// ✅ Exported Builder
export async function buildKdsView(branchId)
{
    if (!branchId) throw new Error("Branch ID missing for KDS view");

    // Await the database call
    const rows = await fetchRawKdsRows(branchId);
    const grouped = groupByOrder(rows);
    const now = Date.now();

    return {
        generatedAt: now,
        orders: grouped.map(order =>
        {
            const lastProgressAt = computeLastProgressAt(order);
            const budget = computeWaitingBudget(order);
            const heat = computeHeat(now, lastProgressAt, budget);

            // Logic: An order is "Blocking" if policy is ALL_AT_ONCE and some items are ready but not all
            const blocking = order.servePolicy === "ALL_AT_ONCE" &&
                order.items.some(i => i.status === "READY") &&
                order.items.some(i => i.status !== "READY");

            // Logic: Determine overall Order Status for column placement
            let overallStatus = 'PENDING';
            const statusCounts = order.items.reduce((acc, i) =>
            {
                acc[i.status] = (acc[i.status] || 0) + 1;
                return acc;
            }, {});

            if (statusCounts['READY'] === order.items.length) overallStatus = 'READY';
            else if (statusCounts['PREPARING'] > 0 || statusCounts['READY'] > 0) overallStatus = 'PREPARING';

            return {
                orderId: order.orderId,
                tableLabel: order.tableLabel,
                servePolicy: order.servePolicy,
                heat,
                pulse: heat === "RED" || blocking,
                blocking,
                note: order.note,
                status: overallStatus, // Used for column sorting
                elapsedMins: Math.floor((now - order.createdAt) / 60000),
                items: order.items
            };
        }),
    };
}