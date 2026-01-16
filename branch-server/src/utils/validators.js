// src/utils/validators.js
import { STAFF_ROLE } from "../staff/staffRoles.js";
import { STAFF_STATUS } from "../staff/staffStates.js";

// Helper: Checks if keys exist in the object
export function assertRequired(body, requiredKeys)
{
    const missing = requiredKeys.filter(key => !body[key]);
    if (missing.length > 0)
    {
        throw new Error(`Missing required fields: ${missing.join(', ')}`);
    }
}

// Helper: Checks if value is part of an Allowed List (Enum)
export function assertEnum(value, allowedValues, fieldName)
{
    const validValues = Object.values(allowedValues);
    if (!validValues.includes(value))
    {
        throw new Error(`Invalid ${fieldName}: '${value}'. Allowed: [${validValues.join(', ')}]`);
    }
}