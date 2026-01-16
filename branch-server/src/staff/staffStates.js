// src/staff/staffStates.js

export const STAFF_STATUS = {
    ACTIVE: 'ACTIVE',       // Can log in and work
    ON_LEAVE: 'ON_LEAVE',   // Cannot work, but employed
    INACTIVE: 'INACTIVE',   // Temporarily suspended
    TERMINATED: 'TERMINATED' // Left the company (Soft Delete)
};

export const ALLOWED_STAFF_TRANSITIONS = {
    [STAFF_STATUS.ACTIVE]: [STAFF_STATUS.ON_LEAVE, STAFF_STATUS.INACTIVE, STAFF_STATUS.TERMINATED],
    [STAFF_STATUS.ON_LEAVE]: [STAFF_STATUS.ACTIVE, STAFF_STATUS.TERMINATED],
    [STAFF_STATUS.INACTIVE]: [STAFF_STATUS.ACTIVE, STAFF_STATUS.TERMINATED],
    [STAFF_STATUS.TERMINATED]: [STAFF_STATUS.ACTIVE], // Rehiring allowed?
};