import { getPendingKdsItems, getPreparingKdsItems, getReadyKdsItems } from "./kds/kdsRepository.js";

import { startPreparingItem, markItemReady } from "./kds/kdsService.js";

const pending = getPendingKdsItems();
console.log(pending);
console.log("PENDING:", pending.length);

startPreparingItem({
    orderItemId: pending[0].order_item_id,
    actorId: chef.id,
});


const preparing = getPreparingKdsItems();
console.log(preparing);
console.log("PREPARING:", preparing.length);

markItemReady({
    orderItemId: preparing[0].order_item_id,
    actorId: chef.id,
});

const ready = getReadyKdsItems();
console.log(ready);
console.log("READY:", ready.length);
