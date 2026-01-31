import { WebSocket, WebSocketServer } from "ws";
import { wsArcjet } from "../arcject.js";

function sendJson(socket, payload) {
    if (socket.readyState != WebSocket.OPEN) return;
    socket.send(JSON.stringify(payload));
}

function broadcast(wss, payload) {
    for (const client of wss.clients) {
        if (client.readyState !== WebSocket.OPEN) continue;
        client.send(JSON.stringify(payload));
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
        sendJson(socket, { type: 'welcome' });
        socket.on('error', console.error);
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
        broadcast(wss, { type: 'match_created', data: match })
    }
    return { broadcastMatchCreated }
}
