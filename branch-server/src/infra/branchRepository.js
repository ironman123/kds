import db from "../db.js";

export async function insertBranch(branch)
{
    // 🔧 FIX: Use Knex .insert()
    await db('branch').insert({
        id: branch.id,
        name: branch.name,
        address: branch.address,
        created_at: branch.createdAt
    });
}

export async function getBranchById(branchId)
{
    // 🔧 FIX: Use Knex .where().first()
    const row = await db('branch')
        .where({ id: branchId })
        .first();

    return row || null;
}

export async function listAllBranches()
{
    // 🔧 FIX: Use Knex .select()
    return await db('branch')
        .select('*')
        .orderBy('created_at', 'desc');
}

export async function updateBranchRepo({ branchId, name, address })
{
    // 🔧 FIX: Knex handles dynamic updates automatically. 
    // We just build an object of what needs changing.
    const updates = {};

    if (name !== undefined) updates.name = name;
    if (address !== undefined) updates.address = address;

    // Safety check: if nothing to update, return early
    if (Object.keys(updates).length === 0) return;

    await db('branch')
        .where({ id: branchId })
        .update(updates);
}