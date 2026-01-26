/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex)
{
    await knex.schema.alterTable('order_items', (table) =>
    {
        table.bigInteger('created_at').nullable();
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex)
{
    await knex.schema.alterTable('order_items', (table) =>
    {
        table.dropColumn('created_at');
    });
};