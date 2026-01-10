import { STAFF_ROLE } from "./staffRoles.js";

export const STAFF_CREATION_RULES = {
    [STAFF_ROLE.OWNER]: [
        STAFF_ROLE.OWNER,
        STAFF_ROLE.MANAGER,
        STAFF_ROLE.CAPTAIN,
        STAFF_ROLE.WAITER,
        STAFF_ROLE.KITCHEN,
    ],

    [STAFF_ROLE.MANAGER]: [
        STAFF_ROLE.CAPTAIN,
        STAFF_ROLE.WAITER,
        STAFF_ROLE.KITCHEN,
    ],
};

export const ROLE_LEVEL = {
    OWNER: 4,
    MANAGER: 3,
    CAPTAIN: 2,
    WAITER: 1,
    KITCHEN: 1,
};

