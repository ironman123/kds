import { WebSocketServer } from "ws";
import { buildKdsView } from "../kds/kdsViewModel.js";
import { changeOrderItemStatus } from "../orders/orderItemService.js";

let wss = null;

/**
 * Initialize KDS WebSocket server
 * @param {http.Server} server
 */
export function initKdsWebSocket(server)
{
    wss = new WebSocketServer({ server });

    console.log("[KDS-WS] WebSocket server initialized");

    wss.on("connection", (ws) =>
    {
        console.log("[KDS-WS] Client connected");

        // 1️⃣ Send initial snapshot
        sendKdsView(ws);

        ws.on("message", (msg) =>
        {
            handleClientMessage(ws, msg);
        });

        ws.on("close", () =>
        {
            console.log("[KDS-WS] Client disconnected");
        });
    });
}

function sendKdsView(ws)
{
    const view = buildKdsView();

    ws.send(JSON.stringify({
        type: "KDS_VIEW",
        payload: view
    }));
}


function broadcastKdsView()
{
    if (!wss) return;

    const view = buildKdsView();
    const message = JSON.stringify({
        type: "KDS_VIEW",
        payload: view
    });

    for (const client of wss.clients)
    {
        if (client.readyState === 1) // OPEN
        {
            client.send(message);
        }
    }
}

function handleClientMessage(ws, raw)
{
    let message;

    try
    {
        message = JSON.parse(raw.toString());
    } catch
    {
        return;
    }

    if (message.type === "ITEM_ACTION")
    {
        handleItemAction(message.payload);
    }
}

function handleItemAction({ itemId, action, actorId })
{
    let newStatus;

    if (action === "START") newStatus = "PREPARING";
    if (action === "COMPLETE") newStatus = "READY";

    if (!newStatus) return;

    try
    {
        changeOrderItemStatus({
            itemId,
            newStatus,
            actorId
        });

        // 🔥 After state change → broadcast fresh view
        broadcastKdsView();
    } catch (e)
    {
        console.error("[KDS-WS]", e.message);
    }
}

