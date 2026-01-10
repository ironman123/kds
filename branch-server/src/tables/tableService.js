import crypto from "crypto";
import { TABLE_STATUS } from "./tableStates.js";
import { insertTable, getTableById, updateTableStatus } from "./tableRepository.js";

export function createTable({ label })
{
    const now = Date.now();

    const table = {
        id: crypto.randomUUID(),
        label,
        status: TABLE_STATUS.FREE,
        createdAt: now,
        updatedAt: now,
    };

    insertTable(table);
    return table;
}

export function markTableOccupied(tableId)
{
    const table = getTableById(tableId);
    if (!table) throw new Error("Table not found");

    if (table.status === TABLE_STATUS.OCCUPIED) return;

    updateTableStatus(tableId, TABLE_STATUS.OCCUPIED);
}

export function assertTableFree(tableId)
{
    const table = getTableById(tableId);
    if (!table) throw new Error("Table not found");

    if (table.status !== TABLE_STATUS.FREE)
    {
        throw new Error(`Table ${table.label} is not free`);
    }
}

export function markTableReserved(tableId)
{
    const table = getTableById(tableId);
    if (!table) throw new Error("Table not found");
    if (table.status === TABLE_STATUS.OCCUPIED)
    {
        throw new Error("Cannot reserve an occupied table");
    }
    if (table.status === TABLE_STATUS.RESERVED) return;

    updateTableStatus(tableId, TABLE_STATUS.RESERVED);
}

export function markTableFree(tableId)
{
    const table = getTableById(tableId);
    if (!table) throw new Error("Table not found");

    updateTableStatus(tableId, TABLE_STATUS.FREE);
}
