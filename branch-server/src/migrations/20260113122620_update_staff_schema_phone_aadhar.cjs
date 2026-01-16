// migrations/2024..._update_staff_schema.js

/**
 * @param { import("knex").Knex } knex
 */
exports.up = async function (knex)
{
    await knex.schema.alterTable('staff', (table) =>
    {
        // 1. Add new identity fields
        table.string('phone').unique(); // Unique: One phone per staff
        table.string('adhaar_number').unique();

        // 2. Add Status (to replace the simple 'active' 0/1)
        table.string('status').defaultTo('INACTIVE');

        // 3. Add timestamp for when they left (Soft Delete tracking)
        table.timestamp('terminated_at');
    });

    // Optional: Migrate old 'active' data to new 'status'
    // 1 = ACTIVE, 0 = INACTIVE
    await knex.raw(`UPDATE staff SET status = 'INACTIVE' WHERE active = 0`);
};

exports.down = async function (knex)
{
    await knex.schema.alterTable('staff', (table) =>
    {
        table.dropColumn('terminated_at');
        table.dropColumn('status');
        table.dropColumn('adhaar_number');
        table.dropColumn('phone');
    });
};