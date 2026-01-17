/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex)
{

    // Helper to add standard sync columns
    const addSync = (tableName) => knex.schema.alterTable(tableName, t =>
    {
        t.integer('deleted_at').nullable();
    });

    // Helper to add BOTH updated_at and deleted_at
    const addFullSync = (tableName) => knex.schema.alterTable(tableName, t =>
    {
        t.integer('updated_at').nullable(); // Nullable initially for existing rows
        t.integer('deleted_at').nullable();
    });

    // --- GROUP A: Add 'deleted_at' only (Already have updated_at) ---
    await addSync('menu_categories');
    await addSync('menu_items');
    await addSync('recipes');
    await addSync('tables');
    await addSync('orders');

    // --- GROUP B: Add 'updated_at' AND 'deleted_at' (Missing both/critical) ---
    await addFullSync('branch');
    await addFullSync('staff');
    await addFullSync('staff_assignments');
    await addFullSync('recipe_ingredients');
    await addFullSync('order_items');

    // --- GROUP C: Add 'branch_id' to Events ---
    // (Events are immutable, so they don't need updated_at/deleted_at)
    const addBranch = (tableName) => knex.schema.alterTable(tableName, t =>
    {
        t.string('branch_id').index(); // Index for faster cloud analytics
    });

    await addBranch('menu_events');
    await addBranch('order_events');
    await addBranch('staff_events');

    // --- OPTIONAL: Backfill updated_at for existing rows ---
    // If you have existing data, set updated_at = created_at so they aren't NULL
    const now = Date.now();
    await knex.raw(`UPDATE branch SET updated_at = created_at WHERE updated_at IS NULL`);
    await knex.raw(`UPDATE staff SET updated_at = created_at WHERE updated_at IS NULL`);
    await knex.raw(`UPDATE recipe_ingredients SET updated_at = ? WHERE updated_at IS NULL`, [now]);
    await knex.raw(`UPDATE order_items SET updated_at = ? WHERE updated_at IS NULL`, [now]);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex)
{
    const dropCols = (table, cols) => knex.schema.alterTable(table, t => t.dropColumns(...cols));

    await dropCols('menu_categories', ['deleted_at']);
    await dropCols('menu_items', ['deleted_at']);
    await dropCols('recipes', ['deleted_at']);
    await dropCols('tables', ['deleted_at']);
    await dropCols('orders', ['deleted_at']);

    await dropCols('branch', ['updated_at', 'deleted_at']);
    await dropCols('staff', ['updated_at', 'deleted_at']);
    await dropCols('staff_assignments', ['updated_at', 'deleted_at']);
    await dropCols('recipe_ingredients', ['updated_at', 'deleted_at']);
    await dropCols('order_items', ['updated_at', 'deleted_at']);

    await dropCols('menu_events', ['branch_id']);
    await dropCols('order_events', ['branch_id']);
    await dropCols('staff_events', ['branch_id']);
};