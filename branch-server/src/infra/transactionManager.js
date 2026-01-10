import db from "../db.js";

export function runInTransaction(fn)
{
    return db.transaction(fn)();
}
