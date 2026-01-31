import WebSocket from 'ws';

console.log('Starting 10 connections...');

for (let i = 0; i < 10; i++) {
    setTimeout(() => {
        const ws = new WebSocket("ws://localhost:8000/ws");

        ws.on('open', () => {
            console.log(`Socket ${i} opened`);
            // Keep it open for a bit
            setTimeout(() => {
                if (ws.readyState === WebSocket.OPEN) ws.close();
            }, 3000);
        });

        ws.on('error', (err) => {
            console.log(`Socket ${i} error:`, err.message);
        });

        ws.on('close', (code, reason) => {
            console.log(`Socket ${i} closed: ${code} ${reason}`);
        });
    }, i * 200); // 200ms stagger to be gentle but testing limits
}
