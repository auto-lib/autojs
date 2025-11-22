/**
 * Example: Two exchanges communicating locally (in-process)
 *
 * This demonstrates:
 * - Creating exchanges
 * - Connecting as peers
 * - Sending messages
 * - Routing between peers
 */

import exchange from './exchange.js';

console.log('=== Exchange Example: Local Peers ===\n');

// ========================================
// Create Client Exchange
// ========================================
const client = exchange({
    id: 'client',
    handlers: {
        'data.response': (name, value, sig, state) => {
            console.log(`[client] Handler called:`, name, value);
            const msg = value;
            console.log(`[client] Received data from ${msg.from}:`, msg.value);
            state.receivedData = msg.value;
        }
    },
    verbose: true
});

// ========================================
// Create Server Exchange
// ========================================
let serverPeerRef; // We'll store peer reference here

const server = exchange({
    id: 'server',
    handlers: {
        'data.request': (name, value, sig, state) => {
            console.log(`[server] Handler called:`, name, value);
            const msg = value;
            console.log(`[server] Received request from ${msg.from}`);

            // Process request
            const result = {
                items: ['apple', 'banana', 'cherry'],
                count: 3
            };

            // Send response back through the peer
            // Note: Start a fresh message (new trace), not a continuation
            if (serverPeerRef) {
                serverPeerRef.send('data.response', result);
            }
        }
    },
    verbose: true
});

// ========================================
// Connect Client to Server
// ========================================
console.log('Connecting client to server...\n');

const serverPeer = client.connect({
    transport: 'local',
    peerId: 'server',
    exchange: server
});

serverPeerRef = server.connect({
    transport: 'local',
    peerId: 'client',
    exchange: client
});

// ========================================
// Client Requests Data from Server
// ========================================
console.log('Client requesting data...\n');

serverPeer.send('data.request', { query: 'all' });

// ========================================
// Check Results
// ========================================
setTimeout(() => {
    console.log('\n=== Message Logs ===\n');

    console.log('Client messages:');
    client.getMessageLog().forEach(msg => {
        console.log(`  ${msg.direction}: ${msg.name}`, msg.value);
    });

    console.log('\nServer messages:');
    server.getMessageLog().forEach(msg => {
        console.log(`  ${msg.direction}: ${msg.name}`, msg.value);
    });

    console.log('\n=== Final State ===\n');
    console.log('Client received:', client.internal().state.receivedData);

}, 100);
