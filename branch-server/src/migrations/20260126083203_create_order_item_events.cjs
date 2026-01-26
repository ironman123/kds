/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex)
{
    await knex.schema.createTable('order_item_events', (table) =>
    {
        // Primary Key
        table.string('id').primary();

        // Sync & Relations
        table.string('branch_id').notNullable().index(); // Indexed for faster sync queries
        table.string('order_id').notNullable().index();
        table.string('order_item_id').notNullable().index(); // Key for tracking specific item history

        // Event Details
        table.string('event_type').notNullable(); // e.g., 'ITEM_ADDED', 'STATUS_CHANGED'
        table.text('old_value').nullable();       // Use text for potential JSON content
        table.text('new_value').nullable();

        // Audit
        table.string('actor_id').notNullable();   // User ID or 'SYSTEM'
        table.bigInteger('created_at').notNullable(); // Storing Date.now()
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex)
{
    await knex.schema.dropTable('order_item_events');
};