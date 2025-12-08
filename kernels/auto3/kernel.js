/**
 * KERNEL - The Policy Engine
 *
 * A universal foundation for intent processing.
 * Handlers declare their policy, kernel executes it.
 *
 * Policies:
 *   - immediate: execute now, can return a value
 *   - deferred: queue for later execution
 *   - dispatch: send to another kernel
 *   - drop: ignore the intent
 *
 * Features:
 *   - transforms: modify intents before processing (middleware)
 *   - routing: dynamically choose policy based on intent
 */

function kernel(config = {}) {
    let queue = [];
    let state = config.state || {};
    let handlers = config.handlers || {};
    let transforms = config.transforms || [];
    let peers = {};  // named connections to other kernels

    // Default route: look up handler config, fall back to deferred
    let route = config.route || ((intent, state) => {
        let handler = handlers[intent.name];
        if (!handler) return 'drop';
        if (typeof handler === 'function') return 'deferred';  // simple function = deferred
        return handler.policy || 'deferred';
    });

    /**
     * Send an intent into the kernel
     */
    function sig(name, value) {
        let intent = { name, value };

        // 1. Apply transforms (middleware)
        for (let transform of transforms) {
            intent = transform(intent, state, sig);
            if (intent === null) return undefined;  // dropped by transform
        }

        // 2. Route - decide which policy
        let policy = route(intent, state);

        // 3. Apply policy
        if (policy === 'immediate') {
            return executeImmediate(intent);
        }
        else if (policy === 'deferred') {
            queue.push(intent);
            return undefined;
        }
        else if (typeof policy === 'object' && policy.type === 'dispatch') {
            return dispatch(intent, policy.targets);
        }
        else if (policy === 'drop') {
            return undefined;
        }
        else {
            console.warn(`Unknown policy: ${policy} for ${intent.name}`);
            return undefined;
        }
    }

    /**
     * Execute an immediate handler - runs now, returns value
     */
    function executeImmediate(intent) {
        let handler = handlers[intent.name];
        if (!handler) return undefined;

        let fn = typeof handler === 'function' ? handler : handler.handler;
        if (!fn) return undefined;

        return fn(intent.name, intent.value, sig, state);
    }

    /**
     * Execute a deferred handler
     */
    function executeDeferred(intent) {
        let handler = handlers[intent.name];
        if (!handler) return;

        let fn = typeof handler === 'function' ? handler : handler.handler;
        if (!fn) return;

        fn(intent.name, intent.value, sig, state);
    }

    /**
     * Dispatch intent to other kernels
     */
    function dispatch(intent, targets) {
        if (typeof targets === 'function') {
            targets = targets(intent, state, peers);
        }
        if (!Array.isArray(targets)) {
            targets = [targets];
        }
        for (let target of targets) {
            if (typeof target === 'string') {
                // Named peer
                if (peers[target]) {
                    peers[target].sig(intent.name, intent.value);
                }
            } else if (target && typeof target.sig === 'function') {
                // Direct kernel reference
                target.sig(intent.name, intent.value);
            }
        }
    }

    /**
     * Process one step - drain current queue
     */
    function step() {
        if (queue.length === 0) return false;

        let current = queue;
        queue = [];

        for (let intent of current) {
            executeDeferred(intent);
        }

        return true;
    }

    /**
     * Run until queue is empty (with safety limit)
     */
    function run(limit = 100) {
        let steps = 0;
        while (queue.length > 0 && steps < limit) {
            step();
            steps++;
        }
        if (steps >= limit) {
            console.warn(`Kernel hit step limit (${limit})`);
        }
        return steps;
    }

    /**
     * Connect to another kernel as a peer
     */
    function connect(name, otherKernel) {
        peers[name] = otherKernel;
    }

    /**
     * Disconnect a peer
     */
    function disconnect(name) {
        delete peers[name];
    }

    return {
        sig,
        step,
        run,
        connect,
        disconnect,
        get state() { return state; },
        get queue() { return queue; },
        get peers() { return peers; },
        _: { state, queue, handlers, peers }
    };
}

export { kernel };
