import db from '../db.js'; // Adjust path if your db.js is elsewhere
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

// CONFIG
const DEFAULT_PASS = "123456";
const BRANCH_ID = "b1_uuid"; // Ensure this matches a real branch ID in your DB!

async function seed()
{
    console.log("🌱 Seeding Staff...");

    // 1. Generate Hash
    const hashedPassword = await bcrypt.hash(DEFAULT_PASS, 10);

    const staffMembers = [
        {
            name: "John Owner",
            username: "owner",
            role: "OWNER",
        },
        {
            name: "Sarah Manager",
            username: "manager",
            role: "MANAGER",
        },
        {
            name: "Mike Captain",
            username: "captain",
            role: "CAPTAIN",
        },
        {
            name: "Lisa Waiter",
            username: "waiter",
            role: "WAITER",
        }
    ];

    // 2. Insert Logic
    for (const staff of staffMembers)
    {
        // Check if exists to avoid duplicates
        const exists = await db('staff').where({ username: staff.username }).first();
        if (exists)
        {
            console.log(`Skipping ${staff.name} (Already exists)`);
            continue;
        }

        await db('staff').insert({
            id: crypto.randomUUID(),
            name: staff.name,
            username: staff.username,
            password_hash: hashedPassword, // Everyone gets '123456'
            role: staff.role,
            branch_id: BRANCH_ID,
            active: 1,
            status: 'ACTIVE',
            must_change_password: false, // Set to FALSE for easier testing right now
            created_at: Date.now()
        });
        console.log(`✅ Created: ${staff.name}`);
    }

    console.log("Done! Press Ctrl+C to exit.");
}

seed();