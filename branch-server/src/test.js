import { createOrder } from "./orders/orderService.js";
import { changeOrderItemStatus } from "./orders/orderItemService.js";
import { addItemToOrder } from "./orders/orderItemService.js";
import { getTableById, insertTable } from "./tables/tableRepository.js";
import { TABLE_STATUS } from "./tables/tableStates.js";
function startPreparingItemWithDelay({
    itemId,
    actorId,
    delayMs = 1 * 60 * 1000 // 2 minutes
})
{
    setTimeout(() =>
    {
        changeOrderItemStatus({
            itemId,
            newStatus: "PREPARING",
            actorId
        });
    }, delayMs);
}

function serveItemWithDelay({
    itemId,
    actorId,
    delayMs = 1 * 60 * 1000
})
{
    setTimeout(() =>
    {
        changeOrderItemStatus({
            itemId,
            newStatus: "SERVED",
            actorId
        });
    }, delayMs);
}

// const table = insertTable({
//     id: "T1",
//     label: "Table1",
//     status: TABLE_STATUS.FREE,
//     createdAt: Date.now(),
//     updatedAt: Date.now(),
// });

let table = getTableById("T1");
console.log("Before ordering:", table.status);
const order2 = createOrder({ tableId: "T1", waiterId: "W6" });

// 2. Add items
const item11 = addItemToOrder({
    orderId: order2.id,
    menuItemId: "GARLIC1",
    quantity: 1
});

const item22 = addItemToOrder({
    orderId: order2.id,
    menuItemId: "GARLIC2",
    quantity: 1
});

// Fetch table BEFORE
table = getTableById("T1");
console.log("Before cooking:", table.status);

// 3. Start preparing
changeOrderItemStatus({
    itemId: item11.id,
    newStatus: "PREPARING",
    actorId: "CHEF2"
});

changeOrderItemStatus({
    itemId: item22.id,
    newStatus: "PREPARING",
    actorId: "CHEF2"
});

// 4. Serve items
changeOrderItemStatus({
    itemId: item11.id,
    newStatus: "READY",
    actorId: "CHEF2"
});

changeOrderItemStatus({
    itemId: item22.id,
    newStatus: "READY",
    actorId: "CHEF2"
});

changeOrderItemStatus({
    itemId: item11.id,
    newStatus: "SERVED",
    actorId: "CHEF2"
});

changeOrderItemStatus({
    itemId: item22.id,
    newStatus: "SERVED",
    actorId: "CHEF2"
});

// 🔁 Re-fetch table AFTER updates
table = getTableById("T1");
console.log("After serving:", table.status);

console.log("Flow 1 completed successfully");


// // 1. Create order
// const order = createOrder({ tableId: "T1", waiterId: "W1", servePolicy: "PARTIAL" });

// // 2. Add items
// const item1 = addItemToOrder({ orderId: order.id, menuItemId: "PIZZA1", quantity: 1 });
// const item2 = addItemToOrder({ orderId: order.id, menuItemId: "PIZZA2", quantity: 1 });

// startPreparingItemWithDelay({
//     itemId: item1.id,
//     actorId: "CHEF1",
//     delayMs: 6000
// });

// startPreparingItemWithDelay({
//     itemId: item2.id,
//     actorId: "CHEF1",
//     delayMs: 2 * 6000
// });

// // After cooking → SERVED
// serveItemWithDelay({
//     itemId: item1.id,
//     actorId: "CHEF1",
//     delayMs: 3 * 6000
// });

// serveItemWithDelay({
//     itemId: item2.id,
//     actorId: "CHEF1",
//     delayMs: 4 * 6000
// });