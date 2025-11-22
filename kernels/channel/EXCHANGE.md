# Exchange: Universal Messaging Architecture

## Vision

**"What if everything was built using messages?"**

Exchange is a platform-agnostic messaging system where:
- Every component is an exchange (producer, consumer, router - all the same)
- Messages flow within processes, between processes, across protocols
- Complete traceability: any state change can be traced through the entire system
- Build applications by connecting exchanges through peers

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    YOUR COMPLEX (everything)                 │
│                                                              │
│  ┌─────────┐      ┌─────────┐      ┌─────────┐             │
│  │Exchange │◄────►│Exchange │◄────►│Exchange │             │
│  │(Browser)│      │(Server) │      │(Worker) │             │
│  └─────────┘      └─────────┘      └─────────┘             │
│       ▲                 ▲                 ▲                  │
│       │                 │                 │                  │
│       └─────────────────┴─────────────────┘                  │
│              All connected as peers                          │
└─────────────────────────────────────────────────────────────┘
```

## Core Concepts

### Everything is an Exchange

An **exchange** has three capabilities:
1. **Handle** messages (process incoming messages)
2. **Emit** messages (send to peers)
3. **Route** messages (forward to peers who can handle them)

There's no distinction between "client" and "server" - a browser is an exchange, a server is an exchange, a database is an exchange. They differ only in:
- What messages they handle
- What peers they connect to
- What transport they use

### Signals as Messages

The **signal kernel** is already an exchange! It:
- Handles signals (`delayed` and `immediate` handlers)
- Emits signals (`sig('run', name)`)
- Routes signals (through the queue)

To make it universal, we just need to:
1. Add **transports** (WebSocket, HTTP, IPC, etc.)
2. Add **peer management** (connect/disconnect)
3. Add **routing** (forward messages to peers)

### Message Structure

Every message has:
```javascript
{
    name: 'set',              // Message type
    value: { ... },           // Message payload
    from: 'exchange-id',      // Where it came from
    to: 'exchange-id',        // Where it's going (optional)
    trace: [...],             // Routing history
    timestamp: 1234567890     // When it was created
}
```

### Transports

A **transport** bridges local signals to remote exchanges:

```javascript
// Local (in-memory, current implementation)
LocalTransport: signals stay in this process

// IPC (Node.js child processes)
IPCTransport: signals via process.send()

// WebSocket (browser ↔ server)
WebSocketTransport: signals via ws.send()

// HTTP (REST APIs)
HTTPTransport: signals via fetch()

// NSQ (distributed queue)
NSQTransport: signals via nsq publish/subscribe
```

All transports implement the same interface:
```javascript
class Transport {
    send(message) { }      // Send message to remote
    onReceive(handler) { } // Called when message arrives
    connect() { }          // Establish connection
    disconnect() { }       // Close connection
}
```

## Implementation Layers

### Layer 1: Signal Kernel (✓ Already Exists)

The core message dispatcher from `signal.js`:
- Queue system
- Handler execution (delayed vs immediate)
- State management

**This layer never changes** - it's frozen.

### Layer 2: Local Exchange (Current `auto.js`)

Adds reactive semantics on top of signals:
- `run`: Execute functions
- `set`: Update values, propagate
- `get`: Track dependencies
- `check circle`: Validate dependencies

**This is one application** of the signal kernel.

### Layer 3: Exchange Layer (What we're building)

Adds peer-to-peer messaging:
- `peer.connect`: Add a peer exchange
- `peer.disconnect`: Remove a peer
- `route`: Forward message to peers
- `broadcast`: Send to all peers
- `subscribe`: Register interest in message types

### Layer 4: Transports (Next step)

Concrete implementations for each protocol:
- `LocalTransport`: In-memory (for testing)
- `WebSocketTransport`: For browser ↔ server
- `IPCTransport`: For parent ↔ child processes
- `HTTPTransport`: For REST endpoints

## API Design

### Creating an Exchange

```javascript
import { exchange } from './exchange.js';

// Create a local exchange
const ex = exchange({
    id: 'my-app',

    // What messages can this exchange handle?
    handlers: {
        'user.login': (msg, sig, state) => {
            // Handle login
            sig('user.authenticated', { userId: 123 });
        },
        'data.fetch': (msg, sig, state) => {
            // Fetch data
            sig('data.result', { items: [...] });
        }
    },

    // Initial state (optional, for reactive exchanges)
    state: {
        users: [],
        count: ($) => $.users.length
    }
});
```

### Connecting Peers

```javascript
// Connect to a remote exchange via WebSocket
const peer = await ex.connect({
    transport: 'websocket',
    url: 'ws://localhost:8080'
});

// Or connect locally (in-process)
const peer = ex.connect({
    transport: 'local',
    exchange: otherExchange
});
```

### Sending Messages

```javascript
// Send to a specific peer
peer.send('data.fetch', { query: 'users' });

// Broadcast to all peers
ex.broadcast('app.status', { healthy: true });

// Send and wait for response (request/reply pattern)
const result = await peer.request('compute.sum', { a: 5, b: 3 });
// result = 8
```

### Subscribing to Messages

```javascript
// Handle messages from any peer
ex.on('user.login', (msg) => {
    console.log('User logged in:', msg.value);
});

// Handle messages from specific peer
peer.on('data.result', (msg) => {
    console.log('Data from server:', msg.value);
});
```

## How Routing Works

When an exchange receives a message:

1. **Can I handle this?**
   - YES → Execute handler, done
   - NO → Continue to step 2

2. **Do I have a peer who can handle this?**
   - YES → Forward to that peer
   - NO → Continue to step 3

3. **Ask my peers if their peers can handle it**
   - Broadcast "who can handle X?"
   - Wait for responses
   - Forward to peer who responds

4. **Nobody can handle it**
   - Emit 'message.unhandled' signal
   - Log warning or error

### Preventing Loops

Messages include a `trace` array:
```javascript
{
    name: 'data.fetch',
    trace: ['exchange-1', 'exchange-2', 'exchange-3']
}
```

Before forwarding, check if current exchange is in trace:
- If YES → Drop message (would create loop)
- If NO → Add self to trace, forward

## Example: Browser ↔ Server ↔ Worker

```javascript
// ========================================
// BROWSER (exchange-browser)
// ========================================
const browser = exchange({
    id: 'browser',
    state: {
        items: [],
        count: ($) => $.items.length
    }
});

// Connect to server
const serverPeer = await browser.connect({
    transport: 'websocket',
    url: 'ws://localhost:8080'
});

// Request data from server
serverPeer.send('items.fetch', {});

// ========================================
// SERVER (exchange-server)
// ========================================
const server = exchange({
    id: 'server',
    handlers: {
        'items.fetch': async (msg, sig, state) => {
            // Forward to worker
            const result = await workerPeer.request('db.query', {
                table: 'items'
            });

            // Send back to browser
            sig('items.result', result);
        }
    }
});

// Accept WebSocket connections from browsers
server.listen({
    transport: 'websocket',
    port: 8080
});

// Connect to worker process
const workerPeer = server.connect({
    transport: 'ipc',
    script: './worker.js'
});

// ========================================
// WORKER (exchange-worker)
// ========================================
const worker = exchange({
    id: 'worker',
    handlers: {
        'db.query': async (msg, sig, state) => {
            const items = await db.select(msg.value.table);
            sig('db.result', items);
        }
    }
});

// Connect back to parent (server)
worker.connect({
    transport: 'ipc',
    parent: true
});
```

**Message Flow:**

```
Browser                 Server                  Worker
   │                      │                        │
   │─ items.fetch ───────>│                        │
   │                      │                        │
   │                      │─── db.query ─────────>│
   │                      │                        │
   │                      │<──── db.result ────────│
   │                      │                        │
   │<─ items.result ──────│                        │
   │                      │                        │
```

**Trace:**
```javascript
{
    name: 'items.fetch',
    from: 'browser',
    trace: ['browser', 'server', 'worker', 'server', 'browser']
}
```

## Benefits

### 1. Complete Traceability

Every message has a full trace:
```javascript
{
    name: 'user.balance.updated',
    value: { balance: 150 },
    trace: [
        'browser',      // User clicked button
        'server',       // Validated request
        'worker',       // Updated database
        'cache',        // Invalidated cache
        'server',       // Prepared response
        'browser'       // Updated UI
    ],
    timestamp: 1234567890
}
```

You can answer: "Why did this value change?" by looking at the trace.

### 2. Platform Agnostic

The same exchange code works everywhere:
- Node.js (using IPC transport)
- Browser (using WebSocket transport)
- Python (using HTTP transport with a Python client)
- Rust (using NSQ transport with a Rust client)

### 3. Testable

Test by creating local exchanges:
```javascript
const app = exchange({ ... });
const fakeServer = exchange({
    handlers: {
        'api.call': (msg, sig) => sig('api.response', { mock: true })
    }
});

app.connect({ transport: 'local', exchange: fakeServer });

// Test without real network
app.send('api.call', {});
// Receives 'api.response' immediately
```

### 4. Reactive + Distributed

Combine reactive state (auto.js) with distributed messaging:

```javascript
const app = exchange({
    state: {
        serverData: null,
        processedData: ($) => $.serverData?.items.map(x => x * 2)
    },
    handlers: {
        'server.data': (msg, sig, state) => {
            sig('set', { name: 'serverData', value: msg.value });
        }
    }
});
```

When remote server sends `server.data`, it triggers:
1. Message received via WebSocket
2. Handler executes
3. Signals `set`
4. Updates `serverData`
5. Reactively updates `processedData`
6. All traced end-to-end

### 5. Observable

Every message goes through the signal system:
```javascript
ex.on('*', (msg) => {
    console.log(`[${msg.from}] ${msg.name}:`, msg.value);
});
```

Perfect for debugging, monitoring, recording.

## Implementation Plan

### Phase 1: Local Exchange (Week 1)
- [ ] Extend current `auto.js` with peer management
- [ ] Add message routing logic
- [ ] Implement LocalTransport for in-process peers
- [ ] Test with multiple local exchanges

### Phase 2: WebSocket Transport (Week 2)
- [ ] Implement WebSocketTransport (client)
- [ ] Implement WebSocketTransport (server)
- [ ] Test browser ↔ server communication
- [ ] Add reconnection logic

### Phase 3: IPC Transport (Week 3)
- [ ] Implement IPCTransport (parent)
- [ ] Implement IPCTransport (child)
- [ ] Test Node.js parent ↔ child communication
- [ ] Add worker pool example

### Phase 4: Advanced Features (Week 4)
- [ ] Request/reply pattern
- [ ] Message persistence (optional)
- [ ] Load balancing across peers
- [ ] Authentication/authorization hooks

### Phase 5: Other Languages (Future)
- [ ] Python client library
- [ ] HTTP transport for REST APIs
- [ ] NSQ transport for queues

## File Structure

```
kernels/channel/
├── signal.js              # Core dispatcher (frozen)
├── auto.js                # Reactive semantics
├── exchange.js            # NEW: Exchange layer
├── transports/
│   ├── local.js           # NEW: In-memory transport
│   ├── websocket.js       # NEW: WebSocket transport
│   ├── ipc.js             # NEW: IPC transport
│   └── http.js            # NEW: HTTP transport
├── examples/
│   ├── local-peers.js     # Local exchange example
│   ├── browser-server.js  # WebSocket example
│   └── parent-worker.js   # IPC example
└── EXCHANGE.md            # This document
```

## Next Steps

1. **Implement `exchange.js`** - Core exchange layer with peer management
2. **Implement `LocalTransport`** - Test with in-process exchanges
3. **Build example** - Two exchanges communicating locally
4. **Add WebSocket transport** - Connect browser to server
5. **Document and iterate** - Refine based on real usage

---

**The Big Idea**: Build your entire software complex on one unified messaging platform. State management, API calls, worker coordination, logging, monitoring - all messages flowing through exchanges. Complete visibility, complete traceability, complete control.
