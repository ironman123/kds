import { createStaff } from "./staff/staffService.js";

const owner = createStaff({ name: "Owner", role: "OWNER" });
const manager = createStaff({
    name: "Manager",
    role: "MANAGER",
    actorId: owner.id,
});

// ✅ allowed
createStaff({
    name: "Waiter",
    role: "WAITER",
    actorId: manager.id,
});

// ❌ should throw
createStaff({
    name: "Manager2",
    role: "MANAGER",
    actorId: manager.id,
});