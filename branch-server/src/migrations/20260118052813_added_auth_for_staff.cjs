/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function up(knex)
{
    return knex.schema.alterTable('staff', (table) =>
    {
        // Identity Columns
        table.string('username').unique().notNullable(); // Unique login ID
        table.string('password_hash').notNullable();     // Encrypted password

        // Optional: Index for faster login lookups
        table.index('username');
    });
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function down(knex)
{
    return knex.schema.alterTable('staff', (table) =>
    {
        table.dropColumn('username');
        table.dropColumn('password_hash');
    });
}