/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex)
{
    // 1. Branch
    await knex.schema.createTable('branch', (table) =>
    {
        table.string('id').primary();
        table.string('name').notNullable();
        table.integer('created_at').notNullable();
        table.string('address').notNullable();
    });

    // 2. Tables (Fixed missing type for branchId)
    await knex.schema.createTable('tables', (table) =>
    {
        table.string('id').primary();
        table.string('label').notNullable();
        table.string('status').notNullable();
        table.integer('created_at').notNullable();
        table.integer('updated_at').notNullable();
        table.string('branchId'); // I assumed TEXT/String here
    });

    // 3. Staff
    await knex.schema.createTable('staff', (table) =>
    {
        table.string('id').primary();
        table.string('name').notNullable();
        table.string('role').notNullable();
        table.integer('active').notNullable();
        table.integer('created_at').notNullable();
    });

    // 4. Staff Events
    await knex.schema.createTable('staff_events', (table) =>
    {
        table.string('id').primary();
        table.string('staff_id').notNullable();
        table.string('event_type').notNullable();
        table.string('old_value');
        table.string('new_value');
        table.string('actor_id');
        table.integer('created_at').notNullable();
    });

    // 5. Menu Categories
    await knex.schema.createTable('menu_categories', (table) =>
    {
        table.string('id').primary();
        table.string('name').notNullable();
        table.integer('sort_order').notNullable();
        table.integer('available').notNullable().defaultTo(1);
        table.integer('created_at').notNullable();
        table.integer('updated_at').notNullable();
    });

    // 6. Menu Items
    await knex.schema.createTable('menu_items', (table) =>
    {
        table.string('id').primary();
        table.string('category_id').notNullable()
            .references('id').inTable('menu_categories')
            .onDelete('RESTRICT').onUpdate('CASCADE');
        table.string('name').notNullable();
        table.integer('price').notNullable();
        table.integer('available').notNullable().defaultTo(1);
        table.integer('prep_time');
        table.integer('created_at').notNullable();
        table.integer('updated_at').notNullable();
    });

    // 7. Menu Events
    await knex.schema.createTable('menu_events', (table) =>
    {
        table.string('id').primary();
        table.string('entity_type').notNullable(); // CATEGORY | ITEM
        table.string('entity_id').notNullable();
        table.string('event_type').notNullable();
        table.string('old_value');
        table.string('new_value');
        table.string('actor_id').notNullable();
        table.integer('created_at').notNullable();
    });

    // 8. Recipes (With Foreign Key)
    await knex.schema.createTable('recipes', (table) =>
    {
        table.string('id').primary();
        table.string('menu_item_id').notNullable()
            .references('id').inTable('menu_items')
            .onDelete('RESTRICT').onUpdate('CASCADE');
        table.text('instructions');
        table.integer('created_at').notNullable();
        table.integer('updated_at').notNullable();
    });

    // 9. Recipe Ingredients (With Foreign Key)
    await knex.schema.createTable('recipe_ingredients', (table) =>
    {
        table.string('id').primary();
        table.string('recipe_id').notNullable()
            .references('id').inTable('recipes')
            .onDelete('RESTRICT').onUpdate('CASCADE');
        table.string('ingredient').notNullable();
        table.string('quantity');
    });

    // 10. Orders
    await knex.schema.createTable('orders', (table) =>
    {
        table.string('id').primary();
        table.string('table_id');
        table.string('waiter_id');
        table.string('status').notNullable();
        table.string('serve_policy').notNullable().defaultTo('PARTIAL');
        table.integer('created_at').notNullable();
        table.integer('updated_at').notNullable();
        table.string('customer_name');
        table.string('customer_phone');
        table.text('notes');
    });

    // 11. Order Items
    await knex.schema.createTable('order_items', (table) =>
    {
        table.string('id').primary();
        table.string('order_id').notNullable();
        table.string('status').notNullable().defaultTo('PENDING');
        table.string('menu_item_id').notNullable();
        table.integer('quantity').notNullable();
        table.text('notes');
        table.integer('started_at');
        table.integer('completed_at');
    });

    // 12. Order Events
    await knex.schema.createTable('order_events', (table) =>
    {
        table.string('id').primary();
        table.string('order_id').notNullable();
        table.string('event_type').notNullable();
        table.string('old_value');
        table.string('new_value');
        table.string('actor_id');
        table.integer('created_at').notNullable();
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex)
{
    // Drop tables in reverse order of creation to avoid Foreign Key errors
    await knex.schema.dropTableIfExists('order_events');
    await knex.schema.dropTableIfExists('order_items');
    await knex.schema.dropTableIfExists('orders');
    await knex.schema.dropTableIfExists('recipe_ingredients');
    await knex.schema.dropTableIfExists('recipes');
    await knex.schema.dropTableIfExists('menu_events');
    await knex.schema.dropTableIfExists('menu_items');
    await knex.schema.dropTableIfExists('menu_categories');
    await knex.schema.dropTableIfExists('staff_events');
    await knex.schema.dropTableIfExists('staff');
    await knex.schema.dropTableIfExists('tables');
    await knex.schema.dropTableIfExists('branch');
};