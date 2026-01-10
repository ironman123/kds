import db from "../db.js";

export function insertStaff(staff)
{
    db.prepare(`
    INSERT INTO staff (id, name, role, active, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(
        staff.id,
        staff.name,
        staff.role,
        staff.active ? 1 : 0,
        staff.createdAt
    );
}

export function getStaffById(staffId)
{
    return db
        .prepare(`SELECT * FROM staff WHERE id = ?`)
        .get(staffId);
}

export function countStaff()
{
    return db
        .prepare(`SELECT COUNT(*) as count FROM staff`)
        .get().count;
}

export function updateStaffActive(staffId, active)
{
    db.prepare(`
    UPDATE staff
    SET active = ?
    WHERE id = ?
  `).run(active ? 1 : 0, staffId);
}

