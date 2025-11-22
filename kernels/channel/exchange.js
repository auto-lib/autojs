/**
 * Exchange: Universal messaging layer built on signal kernel
 *
 * Extends the signal kernel to enable peer-to-peer message routing
 * across process boundaries.
 */

import { signal } from './signal.js';

// Generate unique IDs for exchanges
let exchangeIdCounter = 0;
const generateId = () => `exchange-${++exchangeIdCounter}`;

/**
 * Create an exchange
 *
 * @param {Object} config - Exchange configuration
 * @param {String} config.id - Exchange identifier (auto-generated if not provided)
 * @param {Object} config.handlers - Message handlers { messageName: handlerFn }
 * @param {Object} config.state - Reactive state (optional, for auto.js integration)
 * @param {Boolean} config.verbose - Enable debug logging
 */
export function exchange(config = {}) {

    const id = config.id || generateId();

    // Exchange state
    const state = {
        id,
        peers: {},           // Connected peers { peerId: peer }
        handlers: {},        // Message handlers
        subscriptions: {},   // Event subscriptions
        messageLog: [],      // Message history (for debugging)
        ...config.state      // User-provided state
    };

    // Merge user handlers with built-in handlers
    const delayed = {
        ...buildExchangeHandlers(state),
        ...(config.handlers || {})
    };

    // Immediate handlers (for synchronous operations)
    const immediate = {};

    // Options
    const opt = {
        verbose: config.verbose,
        presig: config.verbose ? (state, n, v) => console.log(`[${id}]`, n, v) : null,
        onerror: (state, e) => console.error(`[${id}] ERROR:`, e)
    };

    // Create signal dispatcher
    const { sig, step, internal } = signal(delayed, immediate, state, opt);

    // Auto-process signal queue
    const process = () => {
        let limit = 100;
        let iterations = 0;
        while (internal().next.length > 0 && iterations < limit) {
            step();
            iterations++;
        }
        if (iterations >= limit) {
            console.warn(`[${id}] Hit processing limit (${limit} iterations)`);
        }
    };

    // Wrap sig to auto-process
    const autoSig = (...args) => {
        sig(...args);
        process();
    };

    // Public API
    const ex = {
        id,
        sig: autoSig,
        step,
        internal,
        process,

        /**
         * Connect to a peer exchange
         */
        connect(peerConfig) {
            const peer = createPeer(ex, peerConfig);
            state.peers[peer.id] = peer;
            sig('peer.connected', peer);
            return peer;
        },

        /**
         * Disconnect from a peer
         */
        disconnect(peerId) {
            const peer = state.peers[peerId];
            if (peer) {
                peer.disconnect();
                delete state.peers[peerId];
                sig('peer.disconnected', { peerId });
            }
        },

        /**
         * Send a message to a specific peer
         */
        send(peerId, messageName, value) {
            const peer = state.peers[peerId];
            if (!peer) {
                console.error(`[${id}] Peer not found: ${peerId}`);
                return;
            }
            peer.send(messageName, value);
        },

        /**
         * Broadcast a message to all peers
         */
        broadcast(messageName, value) {
            Object.values(state.peers).forEach(peer => {
                peer.send(messageName, value);
            });
        },

        /**
         * Subscribe to messages (event listener pattern)
         */
        on(messageName, handler) {
            if (!state.subscriptions[messageName]) {
                state.subscriptions[messageName] = [];
            }
            state.subscriptions[messageName].push(handler);

            // Return unsubscribe function
            return () => {
                const idx = state.subscriptions[messageName].indexOf(handler);
                if (idx > -1) {
                    state.subscriptions[messageName].splice(idx, 1);
                }
            };
        },

        /**
         * Get message history (for debugging)
         */
        getMessageLog() {
            return state.messageLog;
        },

        /**
         * Clear message history
         */
        clearMessageLog() {
            state.messageLog = [];
        }
    };

    return ex;
}

/**
 * Build standard exchange message handlers
 */
function buildExchangeHandlers(state) {
    return {
        /**
         * Handle incoming message from peer
         */
        'message.receive': (name, value, sig, exchangeState) => {
            const { messageName, messageValue, from, trace, timestamp } = value;

            // Log message
            exchangeState.messageLog.push({
                direction: 'in',
                from,
                name: messageName,
                value: messageValue,
                trace,
                timestamp
            });

            // Check if we've seen this message before (loop prevention)
            if (trace.includes(exchangeState.id)) {
                console.warn(`[${exchangeState.id}] Loop detected, dropping message:`, messageName);
                return;
            }

            // Add ourselves to trace
            const newTrace = [...trace, exchangeState.id];

            // Store message context in state for handlers to access
            exchangeState._currentMessage = {
                from,
                trace: newTrace,
                timestamp
            };

            // Forward to signal system - it will route to the right handler
            // The user's handler will be called if it exists
            sig(messageName, {
                name: messageName,
                value: messageValue,
                from,
                trace: newTrace,
                timestamp
            });

            // Fire subscriptions
            if (exchangeState.subscriptions[messageName]) {
                exchangeState.subscriptions[messageName].forEach(handler => {
                    try {
                        handler({ name: messageName, value: messageValue, from, trace: newTrace });
                    } catch (err) {
                        console.error(`[${exchangeState.id}] Subscription error:`, err);
                    }
                });
            }

            // Fire wildcard subscriptions
            if (exchangeState.subscriptions['*']) {
                exchangeState.subscriptions['*'].forEach(handler => {
                    try {
                        handler({ name: messageName, value: messageValue, from, trace: newTrace });
                    } catch (err) {
                        console.error(`[${exchangeState.id}] Wildcard subscription error:`, err);
                    }
                });
            }

            // Clean up context
            delete exchangeState._currentMessage;
        },

        /**
         * Route message to peers who might handle it
         */
        'message.route': (name, value, sig, exchangeState) => {
            const { messageName, messageValue, from, trace, timestamp } = value;

            // Forward to all peers (except the one it came from)
            let forwarded = false;
            Object.values(exchangeState.peers).forEach(peer => {
                if (peer.id !== from && !trace.includes(peer.id)) {
                    peer.send(messageName, messageValue, from, trace, timestamp);
                    forwarded = true;
                }
            });

            if (!forwarded) {
                sig('message.unhandled', { messageName, messageValue, from, trace });
            }
        },

        /**
         * Handle unhandled messages
         */
        'message.unhandled': (name, value, sig, exchangeState) => {
            console.warn(`[${exchangeState.id}] Unhandled message:`, value.messageName);
        },

        /**
         * Peer connected
         */
        'peer.connected': (name, value, sig, exchangeState) => {
            console.log(`[${exchangeState.id}] Peer connected:`, value.id);
        },

        /**
         * Peer disconnected
         */
        'peer.disconnected': (name, value, sig, exchangeState) => {
            console.log(`[${exchangeState.id}] Peer disconnected:`, value.peerId);
        }
    };
}

/**
 * Create a peer connection
 */
function createPeer(exchange, config) {
    const transport = config.transport || 'local';
    const peerId = config.peerId || generateId();

    // Get transport implementation
    let transportImpl;
    if (transport === 'local') {
        transportImpl = createLocalTransport(exchange, config.exchange);
    } else {
        throw new Error(`Unknown transport: ${transport}`);
    }

    // Peer object
    const peer = {
        id: peerId,
        transport,

        /**
         * Send message to this peer
         */
        send(messageName, messageValue, from = exchange.id, trace = [], timestamp = Date.now()) {
            // Log outgoing message
            exchange.internal().state.messageLog.push({
                direction: 'out',
                to: peerId,
                name: messageName,
                value: messageValue,
                trace,
                timestamp
            });

            // Add ourselves to trace if not already there
            const newTrace = trace.includes(exchange.id) ? trace : [...trace, exchange.id];

            // Send via transport
            transportImpl.send({
                messageName,
                messageValue,
                from,
                trace: newTrace,
                timestamp
            });
        },

        /**
         * Disconnect from peer
         */
        disconnect() {
            transportImpl.disconnect();
        },

        /**
         * Subscribe to messages from this peer
         */
        on(messageName, handler) {
            return exchange.on(messageName, (msg) => {
                // Only call handler if message came from this peer
                if (msg.from === peerId) {
                    handler(msg);
                }
            });
        }
    };

    // Setup transport to forward received messages to exchange
    transportImpl.onReceive((message) => {
        exchange.sig('message.receive', message);
    });

    return peer;
}

/**
 * Local transport (in-memory, for testing)
 */
function createLocalTransport(fromExchange, toExchange) {
    if (!toExchange) {
        throw new Error('Local transport requires a target exchange');
    }

    return {
        send(message) {
            // Directly signal the other exchange
            toExchange.sig('message.receive', message);
        },

        onReceive(handler) {
            // For local transport, the other exchange will signal us directly
            // So we just need to handle 'message.receive' in our exchange
            // (already handled by the exchange itself)
        },

        disconnect() {
            // Nothing to clean up for local transport
        }
    };
}

export default exchange;
