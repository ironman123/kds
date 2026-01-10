import db from "../db.js";

export function insertTable(table)
{
    db.prepare(`
    INSERT INTO tables (id, label, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(
        table.id,
        table.label,
        table.status,
        table.createdAt,
        table.updatedAt
    );
}

export function getTableById(tableId)
{
    return db
        .prepare(`SELECT * FROM tables WHERE id = ?`)
        .get(tableId);
}

export function updateTableStatus(tableId, status)
{
    db.prepare(`
    UPDATE tables
    SET status = ?, updated_at = ?
    WHERE id = ?
  `).run(status, Date.now(), tableId);
}

export function getAllTables()
{
    return db
        .prepare(`SELECT * FROM tables`)
        .all();
}

export function getActiveTables()
{
    return db
        .prepare(`
      SELECT * FROM tables
      WHERE status IN ('OCCUPIED', 'RESERVED')
    `).all();
}

export function getFreeTables()
{
    return db
        .prepare(`
      SELECT * FROM tables
      WHERE status = 'FREE'
    `).all();
}