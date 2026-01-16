/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
    return knex.schema
        // 1. UPDATE ORDERS TABLE
        .table('orders', (table) => {
            // Add Foreign Key for waiter (was missing)
            table.foreign('waiter_id').references('id').inTable('staff');

            // Add KDS Timer (Deadline timestamp)
            // Usage: (created_at + prep_time) = target_complete_time
            table.integer('target_complete_time');
        })

        // 2. UPDATE ORDER_ITEMS TABLE
        .table('order_items', (table) => {
            // Add Foreign Keys (were missing)
            table.foreign('order_id').references('id').inTable('orders').onDelete('CASCADE');
            table.foreign('menu_item_id').references('id').inTable('menu_items');

            // Add KDS Workflow timestamp
            // Usage: When the item is removed from the screen
            table.integer('bumped_at');

            // CONVERT NOTES TO MODIFIERS
            // Drop the old text notes
            table.dropColumn('notes');
            // Add JSON column for structured data (e.g., [{"name": "No Onion", "price": 0}])
            table.json('modifiers');
        })

        // 3. UPDATE MENU_CATEGORIES TABLE
        .table('menu_categories', (table) => {
            // Add Sequencing for courses (e.g., 10=Starters, 20=Mains, 30=Desserts)
            // Usage: Sort KDS screen by this column to group items logically
            table.integer('course_sequence').defaultTo(10);
        });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
    return knex.schema
        .table('menu_categories', (table) => {
            table.dropColumn('course_sequence');
        })
        .table('order_items', (table) => {
            table.dropColumn('modifiers');
            table.text('notes'); // Restore notes on rollback
            table.dropColumn('bumped_at');
            table.dropForeign('order_id');
            table.dropForeign('menu_item_id');
        })
        .table('orders', (table) => {
            table.dropColumn('target_complete_time');
            table.dropForeign('waiter_id');
        });
};