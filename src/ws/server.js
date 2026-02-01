import { WebSocket, WebSocketServer } from "ws";
import { wsArcjet } from "../arcject.js";

// Map to track which sockets are subscribed to which match updates
const matchSubscribers = new Map();

function subscribe(matchId, socket) {
    if (!matchSubscribers.has(matchId)) {
        matchSubscribers.set(matchId, new Set());
    }
    matchSubscribers.get(matchId).add(socket);
}

function unsubscribe(matchId, socket) {
    const subscribers = matchSubscribers.get(matchId);
    if (!subscribers) return;

    if (subscribers.size === 0) {
        matchSubscribers.delete(matchId)
    }
    subscribers.delete(socket);
}

function cleanupSubscriptions(socket) {
    for (const [matchId, subscribers] of matchSubscribers) {
        subscribers.delete(socket);
        if (subscribers.size === 0) {
            matchSubscribers.delete(matchId)
        }
    }
}

function sendJson(socket, payload) {
    if (socket.readyState != WebSocket.OPEN) return;
    socket.send(JSON.stringify(payload));
}

function handleMessage(socket, data) {
    let message;
    try {
        message = JSON.parse(data.toString());
    } catch (error) {
        sendJson(socket, { type: 'error', message: 'Invalid JSON' });
        return;
    }
    if (message?.type === "subscribe" && Number.isInteger(message.matchId)) {
        subscribe(message.matchId, socket);
        socket.subscriptions.add(message.matchId);
        sendJson(socket, { type: 'subscribed', matchId: message.matchId });
        return;
    }
    if (message?.type === "unsubscribe" && Number.isInteger(message.matchId)) {
        unsubscribe(message.matchId, socket);
        socket.subscriptions.delete(message.matchId);
        sendJson(socket, { type: 'unsubscribed', matchId: message.matchId });
        return;
    }
}

function broadcastToAll(wss, payload) {
    for (const client of wss.clients) {
        if (client.readyState !== WebSocket.OPEN) continue;
        client.send(JSON.stringify(payload));
    }
}

function broadcastToMatch(matchId, payload) {
    const subscribers = matchSubscribers.get(matchId);
    if (!subscribers || subscribers.size === 0) return;

    const message = JSON.stringify(payload);

    for (const client of subscribers) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    }

}

export function attachWebSocketServer(server) {
    const wss = new WebSocketServer({ noServer: true, path: '/ws', maxPayload: 1024 * 1024 });

    server.on('upgrade', async (request, socket, head) => {
        if (request.url !== '/ws') {
            // Let other handlers handle it or close if exclusive
            // For now passing through as path option in WSS handles it if we used handleUpgrade directly, 
            // but since we are hijacking the event, we should be careful.
            // However, typical pattern is to check path.
            return;
        }

        if (wsArcjet) {
            try {
                const decision = await wsArcjet.protect(request);
                if (decision.isDenied()) {
                    const code = decision.reason.isRateLimit() ? 429 : 403;
                    const statusText = decision.reason.isRateLimit() ? 'Too Many Requests' : 'Forbidden';
                    socket.write(`HTTP/1.1 ${code} ${statusText}\r\n\r\n`);
                    socket.destroy();
                    return;
                }
            } catch (error) {
                console.error("Arcjet error", error);
                socket.write('HTTP/1.1 500 Internal Server Error\r\n\r\n');
                socket.destroy();
                return;
            }
        }

        wss.handleUpgrade(request, socket, head, (ws) => {
            wss.emit('connection', ws, request);
        });
    });

    wss.on('connection', async (socket, req) => {
        socket.isAlive = true;
        socket.on('pong', () => { socket.isAlive = true; });
        socket.subscriptions = new Set();
        sendJson(socket, { type: 'welcome' });

        socket.on('message', (data) => {
            handleMessage(socket, data);
        })
        socket.on('error', () => {
            socket.terminate();
        })
        socket.on('close', () => {
            cleanupSubscriptions(socket);
        })
    });

    const interval = setInterval(() => {
        wss.clients.forEach((ws) => {
            if (ws.isAlive === false) return ws.terminate();
            ws.isAlive = false;
            ws.ping();
        })
    }, 30000);
    wss.on('close', () => clearInterval(interval));
    function broadcastMatchCreated(match) {
        broadcastToAll(wss, { type: 'match_created', data: match })
    }

    function broadcastCommentary(matchId, comment) {
        broadcastToMatch(matchId, { type: 'commentary', data: comment })
    }
    return { broadcastMatchCreated, broadcastCommentary }
}
