/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex)
{

    // 1. Fix the existing 'tables' table (rename branchId to branch_id)
    // Note: SQLite has limited support for renaming columns, so we often recreate or carefully alter.
    // Knex handles this reasonably well, but renaming is cleaner.
    await knex.schema.alterTable('tables', (table) =>
    {
        table.renameColumn('branchId', 'branch_id');
    });

    // 2. Add branch_id to STAFF
    await knex.schema.alterTable('staff', (table) =>
    {
        table.string('branch_id')
            .references('id').inTable('branch')
            .onDelete('CASCADE') // If branch is deleted, delete its staff
            .onUpdate('CASCADE');
    });

    // 3. Add branch_id to ORDERS
    await knex.schema.alterTable('orders', (table) =>
    {
        table.string('branch_id')
            .references('id').inTable('branch')
            .onDelete('CASCADE')
            .onUpdate('CASCADE');
    });

    // 4. Add branch_id to MENU_CATEGORIES
    // (Assuming each branch might have a different menu availability)
    await knex.schema.alterTable('menu_categories', (table) =>
    {
        table.string('branch_id')
            .references('id').inTable('branch')
            .onDelete('CASCADE')
            .onUpdate('CASCADE');
    });

    // Note: We don't need it on 'menu_items' because they belong to 'menu_categories',
    // which now belongs to a branch. The hierarchy is: Branch -> Category -> Item.
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex)
{
    // Undo the changes in reverse order

    await knex.schema.alterTable('menu_categories', (table) =>
    {
        table.dropColumn('branch_id');
    });

    await knex.schema.alterTable('orders', (table) =>
    {
        table.dropColumn('branch_id');
    });

    await knex.schema.alterTable('staff', (table) =>
    {
        table.dropColumn('branch_id');
    });

    await knex.schema.alterTable('tables', (table) =>
    {
        table.renameColumn('branch_id', 'branchId');
    });
};