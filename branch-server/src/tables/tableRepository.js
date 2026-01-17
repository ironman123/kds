// src/tables/tableRepository.js
import db from "../db.js";

// --- CREATE ---

export async function insertTable(tableData)
{
  await db('tables').insert({
    id: tableData.id,
    label: tableData.label,
    status: tableData.status,
    created_at: tableData.createdAt,
    updated_at: tableData.updatedAt,
    branch_id: tableData.branchId,
    deleted_at: null // Explicitly ensure it's alive
  });
}

// --- READ ---

export async function getTableById(tableId, branchId)
{
  const row = await db('tables')
    .where({ id: tableId, branch_id: branchId })
    .whereNull('deleted_at') // 🛡️ FILTER OUT GHOSTS
    .first();

  if (!row) return null;

  return mapRowToTable(row);
}

export async function getTableByName(label, branchId)
{
  const row = await db('tables')
    .where({ label: label, branch_id: branchId })
    .whereNull('deleted_at') // 🛡️ FILTER OUT GHOSTS
    .first();

  if (!row) return null;
  return mapRowToTable(row);
}

export async function listTablesForBranch(branchId)
{
  const rows = await db('tables')
    .where({ branch_id: branchId })
    .whereNull('deleted_at') // 🛡️ FILTER OUT GHOSTS
    .orderBy('label', 'asc');

  return rows.map(mapRowToTable);
}

export async function getFreeTables(branchId)
{
  const rows = await db('tables')
    .where({ branch_id: branchId, status: 'FREE' })
    .whereNull('deleted_at') // 🛡️ FILTER OUT GHOSTS
    .orderBy('label', 'asc');

  return rows.map(mapRowToTable);
}

export async function getActiveTables(branchId)
{
  const rows = await db('tables')
    .where({ branch_id: branchId })
    .whereNot({ status: 'FREE' })
    .whereNull('deleted_at') // 🛡️ FILTER OUT GHOSTS
    .orderBy('label', 'asc');

  return rows.map(mapRowToTable);
}

// --- UPDATE ---

export async function updateTableStatus(tableId, newStatus, branchId)
{
  await db('tables')
    .where({ id: tableId, branch_id: branchId })
    .whereNull('deleted_at') // 🛡️ Safety: Don't resurrect dead tables
    .update({
      status: newStatus,
      updated_at: Date.now()
    });
}

export async function updateTableLabel(tableId, newLabel, branchId)
{
  await db('tables')
    .where({ id: tableId, branch_id: branchId })
    .whereNull('deleted_at') // 🛡️ Safety
    .update({
      label: newLabel,
      updated_at: Date.now()
    });
}

// --- DELETE (SOFT DELETE NOW) ---

export async function deleteTableById(tableId, branchId)
{
  // 🛑 STOP: Do not use .del() anymore!
  // We strictly Update the deleted_at timestamp.
  await db('tables')
    .where({ id: tableId, branch_id: branchId })
    .update({
      deleted_at: Date.now(),
      updated_at: Date.now() // Important: Mark as updated so Sync picks up the deletion!
    });
}

// --- HELPER ---

function mapRowToTable(row)
{
  return {
    id: row.id,
    label: row.label,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    branchId: row.branch_id,
    deletedAt: row.deleted_at // Exposed if needed for debugging/sync logic
  };
}