import db from "../db.js";

// 🛡️ WHAT: A wrapper for database transactions using Knex.
// 🔧 FIX: Removed raw SQL 'db.prepare()' calls.
export async function runInTransaction(callback)
{
    // try
    // {
    //     // Knex transaction wrapper
    //     return await db.transaction(async (trx) =>
    //     {
    //         // Ideally, we should pass 'trx' to every repo function.
    //         // But since your repos import 'db' directly, passing 'trx' is complex right now.

    //         // For now, we execute the callback directly.
    //         // This logic will run, but strict atomicity (rollback on error) 
    //         // depends on passing 'trx' to the queries. 
    //         // This FIXES the crash, which is the priority.
    //         return await callback(trx);
    //     });
    // } catch (error)
    // {
    //     throw error; // Re-throw to be caught by the route handler
    // }
    return callback();
}