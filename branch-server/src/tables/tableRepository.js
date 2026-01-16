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
    branch_id: tableData.branchId
  });
}

// --- READ ---

export async function getTableById(tableId, branchId)
{
  // We enforce branchId to ensure data isolation
  const row = await db('tables')
    .where({ id: tableId, branch_id: branchId })
    .first();

  if (!row) return null;

  return mapRowToTable(row);
}

export async function getTableByName(label, branchId)
{
  const row = await db('tables')
    .where({ label: label, branch_id: branchId })
    .first();
  if (!row) return null;
  return mapRowToTable(row);
}

export async function listTablesForBranch(branchId)
{
  const rows = await db('tables')
    .where({ branch_id: branchId })
    .orderBy('label', 'asc');

  return rows.map(mapRowToTable);
}

export async function getFreeTables(branchId)
{
  const rows = await db('tables')
    .where({ branch_id: branchId, status: 'FREE' })
    .orderBy('label', 'asc');

  return rows.map(mapRowToTable);
}

export async function getActiveTables(branchId)
{
  // 'Active' usually means Occupied or Reserved (not Free)
  const rows = await db('tables')
    .where({ branch_id: branchId })
    .whereNot({ status: 'FREE' }) // This gets both OCCUPIED and RESERVED
    .orderBy('label', 'asc');

  return rows.map(mapRowToTable);
}

// --- UPDATE ---

export async function updateTableStatus(tableId, newStatus, branchId)
{
  // Enforcing branch_id here adds a layer of security (Tenant Isolation)
  // If a hacker guesses an ID from another branch, this query will simply update 0 rows.
  await db('tables')
    .where({ id: tableId, branch_id: branchId })
    .update({
      status: newStatus,
      updated_at: Date.now()
    });
}

export async function updateTableLabel(tableId, newLabel, branchId)
{
  await db('tables')
    .where({ id: tableId, branch_id: branchId })
    .update({
      label: newLabel,
      updated_at: Date.now()
    });
}

// --- DELETE ---

export async function deleteTableById(tableId, branchId)
{
  await db('tables')
    .where({ id: tableId, branch_id: branchId })
    .del();
}

// --- HELPER ---

// Centralized mapper to convert DB snake_case to App camelCase
function mapRowToTable(row)
{
  return {
    id: row.id,
    label: row.label,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    branchId: row.branch_id
  };
}