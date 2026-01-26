import { changeOrderItemStatus } from "../orders/orderItemService.js";
import { ORDER_ITEM_STATUS } from "../orders/orderItemStates.js";
import
{ assertStaffRole } from "../staff/staffService.js";
import { STAFF_ROLE } from "../staff/staffRoles.js";

export function startPreparingItem({ orderItemId, actorId })
{
    //assertStaffRole(actorId, [STAFF_ROLE.KITCHEN, STAFF_ROLE.CAPTAIN]);

    changeOrderItemStatus({
        itemId: orderItemId,
        newStatus: ORDER_ITEM_STATUS.PREPARING,
        actorId,
    });
}

export function markItemReady({ orderItemId, actorId })
{
    //assertStaffRole(actorId, [STAFF_ROLE.KITCHEN, STAFF_ROLE.CAPTAIN]);

    changeOrderItemStatus({
        itemId: orderItemId,
        newStatus: ORDER_ITEM_STATUS.READY,
        actorId,
    });
}
