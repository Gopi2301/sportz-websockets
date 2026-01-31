import { WebSocket, WebSocketServer } from "ws";

/**
 * Send a JSON-serialized payload over a WebSocket if the socket is open.
 * Does nothing when the socket is not in the OPEN state.
 * @param {WebSocket} socket - The target WebSocket connection.
 * @param {*} payload - The value to serialize with JSON.stringify and send.
 */
function sendJson(socket, payload) {
    if (socket.readyState != WebSocket.OPEN) return;
    socket.send(JSON.stringify(payload));
}

/**
 * Broadcasts a JSON-serializable payload to all currently open clients of a WebSocket server.
 *
 * Only clients whose `readyState` equals `WebSocket.OPEN` will receive the message;
 * the payload is sent as `JSON.stringify(payload)`.
 *
 * @param {import('ws').WebSocketServer} wss - The WebSocket server whose connected clients will receive the payload.
 * @param {*} payload - The value to serialize and send to each open client.
 */
function broadcast(wss, payload) {
    for (const client of wss.clients) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(payload));
        }
    }
}

/**
 * Attach a WebSocket server to an existing HTTP server and provide a helper to broadcast 'match_created' messages.
 * @param {import('http').Server} server - Existing HTTP server to attach the WebSocket server to.
 * @returns {{ broadcastMatchCreated: (match: any) => void }} An object with a `broadcastMatchCreated` function that broadcasts a message of type `'match_created'` containing the provided `match` data to all connected WebSocket clients.
 */
export function attachWebSocketServer(server) {
    const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 1024 * 1024 });
    wss.on('connection', (socket) => {
        sendJson(socket, { type: 'welcome' });
        socket.on('error', console.error);
    });

    function broadcastMatchCreated(match) {
        broadcast(wss, { type: 'match_created', data: match })
    }
    return { broadcastMatchCreated }
}