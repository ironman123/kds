/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex)
{
    await knex.schema.alterTable('roles', (table) =>
    {
        table.bigInteger('deleted_at').nullable().defaultTo(null);
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex)
{
    await knex.schema.alterTable('roles', (table) =>
    {
        table.dropColumn('deleted_at');
    });
};