/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex)
{
    // 1. Create PERMISSIONS Table
    await knex.schema.createTable('permissions', (table) =>
    {
        table.string('id').primary();
        table.string('resource').notNullable();
        table.string('description');
    });

    // 2. Create ROLES Table
    await knex.schema.createTable('roles', (table) =>
    {
        table.uuid('id').primary(); // We will generate UUID manually in code
        table.string('name').notNullable();
        table.uuid('branch_id').nullable().references('id').inTable('branch').onDelete('CASCADE');
        table.text('description');
        table.boolean('is_system_role').defaultTo(false);
        table.bigInteger('created_at');
        table.bigInteger('updated_at');

        // Unique constraint: Branch-specific or Global unique names
        table.unique(['branch_id', 'name']);
    });

    // 3. Create ROLE_PERMISSIONS Table
    await knex.schema.createTable('role_permissions', (table) =>
    {
        table.uuid('role_id').references('id').inTable('roles').onDelete('CASCADE');
        table.string('permission_id').references('id').inTable('permissions').onDelete('CASCADE');
        table.primary(['role_id', 'permission_id']);
    });

    // 4. Update STAFF Table
    // Check if column exists first to be safe
    const hasColumn = await knex.schema.hasColumn('staff', 'role_id');
    if (!hasColumn)
    {
        await knex.schema.alterTable('staff', (table) =>
        {
            table.uuid('role_id').nullable().references('id').inTable('roles').onDelete('SET NULL');
        });
    }

    // ============================================================
    //    DATA MIGRATION (SEEDING)
    // ============================================================

    // A. Define Permissions
    const permissions = [
        { id: 'menu.view', resource: 'MENU', description: 'View menu items' },
        { id: 'menu.manage', resource: 'MENU', description: 'Create, edit, delete menu items' },

        { id: 'table.view', resource: 'TABLE', description: 'View floor plan' },
        { id: 'table.manage', resource: 'TABLE', description: 'Create or delete tables' },
        { id: 'table.update_status', resource: 'TABLE', description: 'Change table status' },

        { id: 'order.view', resource: 'ORDER', description: 'View active orders' },
        { id: 'order.create', resource: 'ORDER', description: 'Punch new orders' },
        { id: 'order.update', resource: 'ORDER', description: 'Update order status' },
        { id: 'order.void', resource: 'ORDER', description: 'Cancel/Void orders' },

        { id: 'staff.manage', resource: 'STAFF', description: 'Hire, fire, and edit staff' },
        { id: 'report.view', resource: 'REPORT', description: 'View sales reports' },

        { id: 'branch.view', resource: 'BRANCH', description: 'View list of branches' },
        { id: 'branch.manage', resource: 'BRANCH', description: 'Create and edit branches' },

    ];

    await knex('permissions').insert(permissions);

    // B. Define System Roles & Map Permissions
    const systemRoles = [
        {
            name: 'MANAGER',
            perms: ['branch.view', 'menu.view', 'menu.manage', 'table.view', 'table.manage', 'table.update_status', 'order.view', 'order.create', 'order.update', 'order.void', 'staff.manage', 'report.view']
        },
        {
            name: 'CAPTAIN',
            perms: ['branch.view', 'menu.view', 'table.view', 'table.update_status', 'order.view', 'order.create', 'order.update']
        },
        {
            name: 'WAITER',
            perms: ['branch.view', 'menu.view', 'table.view', 'table.update_status', 'order.view', 'order.create']
        },
        {
            name: 'CHEF',
            perms: ['branch.view', 'menu.view', 'order.view', 'order.update']
        }
    ];

    // Helper to generate UUID compatible with SQLite/Knex
    const crypto = require('crypto');

    // Insert Roles and link Permissions
    for (const roleDef of systemRoles)
    {
        const newRoleId = crypto.randomUUID();

        // 1. Insert Role (Without RETURNING)
        await knex('roles').insert({
            id: newRoleId,
            name: roleDef.name,
            is_system_role: true,
            created_at: Date.now(),
            updated_at: Date.now()
        });

        // 2. Insert Permissions using the known ID
        const rolePerms = roleDef.perms.map(pId => ({
            role_id: newRoleId,
            permission_id: pId
        }));

        if (rolePerms.length > 0)
        {
            await knex('role_permissions').insert(rolePerms);
        }

        // 3. MIGRATE EXISTING STAFF
        // Case insensitive match for existing roles
        await knex('staff')
            .whereRaw('LOWER(role) = ?', [roleDef.name.toLowerCase()])
            .update({ role_id: newRoleId });
    }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex)
{
    // Check if column exists before dropping to prevent errors on partial rollbacks
    const hasColumn = await knex.schema.hasColumn('staff', 'role_id');
    if (hasColumn)
    {
        await knex.schema.alterTable('staff', (table) =>
        {
            table.dropColumn('role_id');
        });
    }

    await knex.schema.dropTableIfExists('role_permissions');
    await knex.schema.dropTableIfExists('roles');
    await knex.schema.dropTableIfExists('permissions');
};