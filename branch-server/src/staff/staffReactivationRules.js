import { STAFF_ROLE } from "./staffRoles.js";

export const STAFF_REACTIVATION_RULES = {
    [STAFF_ROLE.OWNER]: [
        STAFF_ROLE.OWNER,
        STAFF_ROLE.MANAGER,
        STAFF_ROLE.CAPTAIN,
        STAFF_ROLE.WAITER,
        STAFF_ROLE.KITCHEN,
    ],

    [STAFF_ROLE.MANAGER]: [
        STAFF_ROLE.WAITER,
        STAFF_ROLE.KITCHEN,
    ],
};
