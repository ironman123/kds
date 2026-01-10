/**
 * @typedef {"GREEN"|"YELLOW"|"ORANGE"|"RED"} HeatState
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

function fetchRawKdsRows()
{
    return db.prepare(`
    SELECT
      o.id AS order_id,
      o.serve_policy,
      o.created_at AS order_created_at,
      -- o.notes AS order_note,

      t.label AS table_label,

      oi.id AS order_item_id,
      oi.status AS item_status,
      oi.quantity,
      oi.started_at,
      oi.completed_at,
      oi.notes AS item_note,
    -- oi.created_at AS item_created_at,

      mi.name AS item_name,
      mi.prep_time

    FROM orders o
    JOIN order_items oi ON oi.order_id = o.id
    JOIN menu_items mi ON mi.id = oi.menu_item_id
    JOIN tables t ON t.id = o.table_id

    WHERE oi.status != 'COMPLETED'
    ORDER BY o.created_at ASC
  `).all();
}

function computeLastProgressAt(order)
{
    const completed = order.items
        .map(i => i.completedAt)
        .filter(Boolean);

    if (completed.length > 0)
    {
        return Math.max(...completed);
    }

    const started = order.items
        .map(i => i.startedAt)
        .filter(Boolean);

    if (started.length > 0)
    {
        return Math.min(...started);
    }

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
                tableLabel: r.table_label,
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
            createdAt: r.item_created_at,
            note: r.item_note,
        });
    }

    return [...map.values()];
}

function computeWaitingBudget(order)
{
    const totalPrep = order.items
        .map(i => i.prepTime || 0)
        .reduce((a, b) => a + b, 0);

    return Math.max(totalPrep * 60_000 * 1.2, 5 * 60_000);
}


function computeHeat(now, lastProgressAt, budget)
{
    const ratio = (now - lastProgressAt) / budget;
    if (ratio < 0.5) return "GREEN";
    if (ratio < 0.8) return "YELLOW";
    if (ratio < 1.0) return "ORANGE";
    return "RED";
}

export function buildKdsView()
{
    const rows = fetchRawKdsRows();
    const grouped = groupByOrder(rows);
    const now = Date.now();

    return {
        generatedAt: now,
        orders: grouped.map(order =>
        {
            const lastProgressAt = computeLastProgressAt(order);
            const budget = computeWaitingBudget(order);
            const heat = computeHeat(now, lastProgressAt, budget);

            const blocking =
                order.servePolicy === "ALL_AT_ONCE" &&
                order.items.some(i => i.status !== "READY");

            return {
                orderId: order.orderId,
                tableLabel: order.tableLabel,
                servePolicy: order.servePolicy,
                heat,
                pulse: heat === "RED" || blocking,
                blocking,
                note: order.note,
                items: order.items.map(i => ({
                    orderItemId: i.orderItemId,
                    name: i.name,
                    quantity: i.quantity,
                    status: i.status,
                    note: i.note,
                    isBlocking:
                        order.servePolicy === "ALL_AT_ONCE" && i.status !== "READY",
                    hint:
                        i.status === "PREPARING"
                            ? "ACTIVE"
                            : i.status === "PENDING" && heat !== "GREEN"
                                ? "WAITING"
                                : "NONE",
                })),
            };
        }),
    };
}
