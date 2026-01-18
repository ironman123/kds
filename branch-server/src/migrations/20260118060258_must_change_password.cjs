/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex)
{
    return knex.schema.alterTable('staff', (table) =>
    {
        // 1 = True, 0 = False
        // We default to true (1) so new hires are forced to reset by default.
        table.boolean('must_change_password').defaultTo(true);
    });
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex)
{
    return knex.schema.alterTable('staff', (table) =>
    {
        table.dropColumn('must_change_password');
    });
}