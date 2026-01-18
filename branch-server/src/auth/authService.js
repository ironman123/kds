import db from "../db.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { STAFF_STATUS } from "../staff/staffStates.js";

const JWT_SECRET = process.env.JWT_SECRET || "yolo";

/* ============================================================
   1. REGISTRATION (The Provisioning)
   Used by Owners/Managers to hire new staff.
   It sets 'must_change_password' to TRUE by default.
============================================================ */
export async function registerStaff({ username, password, role, branchId, name, phone })
{

    // 1. Validation: Ensure username is unique
    const existing = await db('staff').where({ username }).first();
    if (existing) throw new Error(`Username '${username}' is already taken.`);

    // 2. Encryption: Never store plain text
    const hashedPassword = await bcrypt.hash(password, 10);

    const newStaff = {
        id: crypto.randomUUID(),
        username,
        password_hash: hashedPassword,
        role,           // e.g. 'WAITER'
        branch_id: branchId,
        name,
        phone,
        active: 1,      // 1 = True (SQLite/MySQL often use 1/0 for bools)
        status: STAFF_STATUS.ACTIVE,
        must_change_password: true, // 🔒 LOCK THE ACCOUNT INITIALLY
        created_at: Date.now()
    };

    // 3. Save to DB
    await db('staff').insert(newStaff);

    return {
        id: newStaff.id,
        username,
        message: "Staff created. Please share these credentials securely."
    };
}

/* ============================================================
   2. LOGIN (The Gatekeeper)
   Used by everyone to get their access token.
   It checks the Lock Flag.
============================================================ */
export async function loginStaff(username, password)
{

    // 1. Find User
    const staff = await db('staff').where({ username }).first();
    if (!staff) throw new Error("Invalid credentials");

    // 2. Security Checks
    if (staff.status !== STAFF_STATUS.ACTIVE) throw new Error(`Account is ${staff.status || 'DISABLED'}`);

    // 3. Verify Password
    const isValid = await bcrypt.compare(password, staff.password_hash);
    if (!isValid) throw new Error("Invalid credentials");

    // 4. Generate Token (The Badge)
    const token = jwt.sign(
        {
            userId: staff.id,
            role: staff.role,
            branchId: staff.branch_id,
            username: staff.username
        },
        JWT_SECRET,
        { expiresIn: '12h' }
    );

    // 5. 🚨 THE "FORCE RESET" CHECK
    // If the flag is true, we tell the frontend: "Don't go to dashboard yet!"
    if (staff.must_change_password)
    {
        return {
            token, // We still give a token so they can call the 'change-password' API
            user: { id: staff.id, role: staff.role, name: staff.name },
            requirePasswordChange: true // ⚠️ The Signal for the Frontend
        };
    }

    // Normal Login
    return {
        token,
        user: { id: staff.id, role: staff.role, name: staff.name },
        requirePasswordChange: false
    };
}

/* ============================================================
   3. PASSWORD UPDATE (The Unlock)
   Called when a user provides a new password.
   It clears the 'must_change_password' flag.
============================================================ */
export async function updatePassword(userId, newPassword)
{
    // 1. Encrypt new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // 2. Update DB & Clear Flag
    await db('staff')
        .where({ id: userId })
        .update({
            password_hash: hashedPassword,
            must_change_password: false, // 🔓 UNLOCK ACCOUNT
            updated_at: Date.now()
        });

    return true;
}