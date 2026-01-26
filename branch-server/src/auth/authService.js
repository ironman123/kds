import db from "../db.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { STAFF_STATUS } from "../staff/staffStates.js";

const JWT_SECRET = process.env.JWT_SECRET || "yolo";

/* ============================================================
   1. REGISTRATION (The Provisioning)
============================================================ */
export async function registerStaff({ username, password, role, roleId, branchId, name, phone })
{
    // 1. Validation: Ensure username is unique
    const existing = await db('staff').where({ username }).first();
    if (existing) throw new Error(`Username '${username}' is already taken.`);

    // 2. Resolve Role ID if missing (Backward Compatibility)
    // If frontend sends 'roleId', use it. If only 'role' name is sent, look up the ID.
    let finalRoleId = roleId;
    if (!finalRoleId && role)
    {
        const roleRecord = await db('roles').whereRaw('LOWER(name) = ?', [role.toLowerCase()]).first();
        if (roleRecord) finalRoleId = roleRecord.id;
    }

    // 3. Encryption
    const hashedPassword = await bcrypt.hash(password, 10);

    const newStaff = {
        id: crypto.randomUUID(),
        username,
        password_hash: hashedPassword,
        role,           // e.g. 'WAITER' (Keep for legacy/display)
        role_id: finalRoleId, // 👈 CRITICAL: Link to Permissions System
        branch_id: branchId,
        name,
        phone,
        active: 1,
        status: STAFF_STATUS.ACTIVE,
        must_change_password: true,
        created_at: Date.now()
    };

    await db('staff').insert(newStaff);

    return {
        id: newStaff.id,
        username,
        message: "Staff created. Please share these credentials securely."
    };
}

/* ============================================================
   2. LOGIN (The Gatekeeper)
============================================================ */
export async function loginStaff(username, password)
{
    // 1. Find User (Explicitly select role_id)
    const staff = await db('staff')
        .where({ username })
        .select('id', 'username', 'password_hash', 'role', 'role_id', 'branch_id', 'name', 'status', 'must_change_password')
        .first();

    if (!staff) throw new Error("Invalid credentials");

    // 2. Security Checks
    if (staff.status !== STAFF_STATUS.ACTIVE) throw new Error(`Account is ${staff.status || 'DISABLED'}`);

    // 3. Verify Password
    const isValid = await bcrypt.compare(password, staff.password_hash);
    if (!isValid) throw new Error("Invalid credentials");

    // 4. Generate Token (Includes roleId for Middleware)
    const token = jwt.sign(
        {
            userId: staff.id,
            role: staff.role,       // For 'OWNER' check
            branchId: staff.branch_id,
            username: staff.username,
            roleId: staff.role_id   // 👈 For Permission Check
        },
        JWT_SECRET,
        { expiresIn: '12h' }
    );

    // 5. Construct User Object (For Frontend Store)
    const userPayload = {
        id: staff.id,
        role: staff.role,
        roleId: staff.role_id, // 👈 CRITICAL: Frontend needs this to save state
        name: staff.name,
        branchId: staff.branch_id
    };

    // 6. Force Reset Check
    if (staff.must_change_password)
    {
        return {
            token,
            user: userPayload,
            requirePasswordChange: true
        };
    }

    // Normal Login
    return {
        token,
        user: userPayload,
        requirePasswordChange: false
    };
}

/* ============================================================
   3. PASSWORD UPDATE
============================================================ */
export async function updatePassword(userId, newPassword)
{
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await db('staff')
        .where({ id: userId })
        .update({
            password_hash: hashedPassword,
            must_change_password: false,
            updated_at: Date.now()
        });

    return true;
}