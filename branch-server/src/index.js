
import { createServer } from "./server.js";
import { config } from "./config.js";
import { initSchema } from "./schema.js";
// import { ORDER_STATUS } from "./orders/orderStates.js";
// import { createOrder, changeOrderStatus } from "./orders/orderService.js";

initSchema();

const app = createServer();

app.listen(config.PORT, () =>
{
    console.log(`Branch server running on port ${config.PORT}`);
})

// const testOrder = createOrder({
//     tableId: "T1",
//     waiterId: "W1",
// });

// console.log("Created:", testOrder);
// await setTimeout(() => { }, 6000);
// changeOrderStatus({
//     orderId: testOrder.id,
//     newStatus: ORDER_STATUS.PREPARING,
//     actorId: "KITCHEN1",
// });

// console.log("Status updated");