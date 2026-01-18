// copy-data.js
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

async function copyData()
{
    // 1. Connect to both databases
    const oldDb = await open({ filename: './data/branchtem.db', driver: sqlite3.Database });
    const newDb = await open({ filename: './data/branch.db', driver: sqlite3.Database });

    console.log("🚀 Starting Data Migration...");

    // --- HELPER FUNCTION ---
    async function moveTable(tableName, columnMapping = {})
    {
        try
        {
            // Get all rows from old DB
            const rows = await oldDb.all(`SELECT * FROM ${tableName}`);

            if (rows.length === 0)
            {
                console.log(`⚠️  Skipping ${tableName} (No data found)`);
                return;
            }

            console.log(`📦 Moving ${rows.length} rows for: ${tableName}`);

            // Insert into new DB
            for (const row of rows)
            {
                // Apply column renames (Mapping)
                // Example: if mapping is { branchId: 'branch_id' }, we rename the property
                for (const [oldCol, newCol] of Object.entries(columnMapping))
                {
                    if (row[oldCol] !== undefined)
                    {
                        row[newCol] = row[oldCol];
                        delete row[oldCol]; // Remove the old key
                    }
                }

                // Generate the SQL specific for this row
                const columns = Object.keys(row).join(', ');
                const placeholders = Object.keys(row).map(() => '?').join(', ');
                const values = Object.values(row);

                await newDb.run(
                    `INSERT OR IGNORE INTO ${tableName} (${columns}) VALUES (${placeholders})`,
                    values
                );
            }
            console.log(`✅ ${tableName} Done!`);
        } catch (err)
        {
            console.error(`❌ Failed on ${tableName}:`, err.message);
        }
    }

    // --- EXECUTE MOVES ---

    // 1. Tables without changes
    await moveTable('branch');
    await moveTable('staff');
    await moveTable('menu_categories');
    await moveTable('menu_items');
    await moveTable('orders');
    await moveTable('order_items');
    // ... add other simple tables here

    // 2. Tables WITH RENAMED COLUMNS
    // We renamed 'branchId' to 'branch_id' in your migrations
    await moveTable('tables', { branchId: 'branch_id' });

    console.log("🎉 Migration Complete!");
}

copyData();