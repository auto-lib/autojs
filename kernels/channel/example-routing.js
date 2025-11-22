/**
 * Example: Three-way message routing
 *
 * Topology:  Browser <-> Server <-> Database
 *
 * Demonstrates:
 * - Message routing through intermediaries
 * - Request/response flows across multiple hops
 * - Complete traceability through the entire system
 */

import exchange from './exchange.js';

console.log('=== Exchange Example: Three-Way Routing ===\n');

// ========================================
// Create Database Exchange
// ========================================
const database = exchange({
    id: 'database',
    handlers: {
        'db.query': (name, value, sig, state) => {
            const msg = value;
            console.log(`[database] Query received:`, msg.value.query);

            // Simulate database query
            const result = {
                query: msg.value.query,
                results: [
                    { id: 1, name: 'Alice' },
                    { id: 2, name: 'Bob' },
                    { id: 3, name: 'Charlie' }
                ]
            };

            // Send result back
            console.log(`[database] Sending results back to ${msg.from}`);
            state.peers['server'].send('db.result', result);
        }
    }
});

// ========================================
// Create Server Exchange
// ========================================
const server = exchange({
    id: 'server',
    handlers: {
        'api.users': (name, value, sig, state) => {
            const msg = value;
            console.log(`[server] API request from ${msg.from}`);

            // Forward to database
            console.log(`[server] Forwarding to database...`);
            state.peers['database'].send('db.query', {
                query: 'SELECT * FROM users'
            });
        },

        'db.result': (name, value, sig, state) => {
            const msg = value;
            console.log(`[server] Database results received`);

            // Process and send to browser
            const response = {
                users: msg.value.results,
                count: msg.value.results.length
            };

            console.log(`[server] Sending processed data to browser...`);
            state.peers['browser'].send('api.response', response);
        }
    }
});

// ========================================
// Create Browser Exchange
// ========================================
const browser = exchange({
    id: 'browser',
    handlers: {
        'api.response': (name, value, sig, state) => {
            const msg = value;
            console.log(`[browser] API response received:`, msg.value);
            state.userData = msg.value.users;
            state.userCount = msg.value.count;
        }
    }
});

// ========================================
// Connect the topology
// ========================================
console.log('Setting up topology: Browser <-> Server <-> Database\n');

// Server connects to both
server.connect({
    transport: 'local',
    peerId: 'browser',
    exchange: browser
});

server.connect({
    transport: 'local',
    peerId: 'database',
    exchange: database
});

// Browser connects to server
browser.connect({
    transport: 'local',
    peerId: 'server',
    exchange: server
});

// Database connects to server
database.connect({
    transport: 'local',
    peerId: 'server',
    exchange: server
});

// ========================================
// Browser makes API request
// ========================================
console.log('Browser requesting users...\n');

browser.internal().state.peers['server'].send('api.users', {});

// ========================================
// Check Results
// ========================================
setTimeout(() => {
    console.log('\n=== Message Flow ===\n');

    console.log('Browser messages:');
    browser.getMessageLog().forEach(msg => {
        console.log(`  ${msg.direction === 'out' ? '→' : '←'} ${msg.name}`);
    });

    console.log('\nServer messages:');
    server.getMessageLog().forEach(msg => {
        const dir = msg.direction === 'out' ? '→' : '←';
        const peer = msg.direction === 'out' ? msg.to : msg.from;
        console.log(`  ${dir} ${msg.name} (${peer})`);
    });

    console.log('\nDatabase messages:');
    database.getMessageLog().forEach(msg => {
        console.log(`  ${msg.direction === 'out' ? '→' : '←'} ${msg.name}`);
    });

    console.log('\n=== Final State ===\n');
    console.log('Browser has', browser.internal().state.userCount, 'users:');
    console.log(browser.internal().state.userData);

    console.log('\n=== Complete Trace ===\n');
    console.log('Request Flow:  Browser → Server → Database');
    console.log('Response Flow: Database → Server → Browser');
    console.log('\nEach hop is traced, creating complete visibility');

}, 100);
