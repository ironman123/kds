/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex)
{
    // 1. Create the Junction Table
    await knex.schema.createTable('staff_assignments', (table) =>
    {
        table.string('staff_id').references('id').inTable('staff').onDelete('CASCADE');
        table.string('branch_id').references('id').inTable('branch').onDelete('CASCADE');

        // Track when they were assigned and by whom
        table.integer('assigned_at').notNullable();
        table.string('assigned_by'); // ID of the manager who assigned them

        // Composite Primary Key: A staff member cannot be assigned to the same branch twice
        table.primary(['staff_id', 'branch_id']);
    });

    // 2. DATA MIGRATION: Backfill existing relationships
    // We need to take every current staff member and add their 'home' branch to this list
    const allStaff = await knex('staff').select('id', 'branch_id');

    const assignments = allStaff
        .filter(s => s.branch_id) // Only if they have a branch assigned
        .map(staff => ({
            staff_id: staff.id,
            branch_id: staff.branch_id,
            assigned_at: Date.now(),
            assigned_by: 'SYSTEM_MIGRATION'
        }));

    if (assignments.length > 0)
    {
        await knex('staff_assignments').insert(assignments);
    }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex)
{
    await knex.schema.dropTable('staff_assignments');
};