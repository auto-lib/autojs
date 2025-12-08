/**
 * BLOCK - Composable Reactive Blocks
 *
 * A block is a kernel with:
 *   - needs: inputs it expects from outside
 *   - gives: outputs it provides to outside
 *   - Automatic wiring via dispatch policy
 *
 * Key insight: cross-block communication uses the kernel's
 * dispatch policy, not manual sig() calls in handlers.
 */

import { kernel } from './kernel.js';
import { createReactiveHandlers, createReactiveState } from './graph.js';

/**
 * Create a block with needs/gives interface
 */
function block(config) {
    let { name, needs = [], gives = [], state: initialValues = {} } = config;

    // Create reactive state
    let state = createReactiveState();
    state.blockName = name;
    state.needs = needs;
    state.gives = gives;
    state.wires = [];  // { from, targetBlock, to }

    // Get base reactive handlers
    let handlers = createReactiveHandlers();

    // Add input handler - receives values from other blocks
    handlers.input = {
        policy: 'deferred',
        handler: (n, value, sig, state) => {
            let { target, val } = value;
            state.cache[target] = val;
            sig('invalidate', target);
        }
    };

    // Output signal - will be routed to dispatch by the route function
    // No handler needed - dispatch handles it entirely
    handlers.output = {
        policy: 'deferred',  // overridden by route
        handler: () => {}    // no-op, dispatch does the work
    };

    // Modify set handler to also emit output for 'gives' values
    let originalSetHandler = handlers.set.handler;
    handlers.set.handler = (n, value, sig, state) => {
        originalSetHandler(n, value, sig, state);

        let { target } = value;
        if (state.gives.includes(target)) {
            sig('output', { target, val: state.cache[target] });
        }
    };

    // Modify run handler to emit output for computed 'gives' values
    let originalRunHandler = handlers.run.handler;
    handlers.run.handler = (n, value, sig, state) => {
        let target = value;
        let oldValue = state.cache[target];

        originalRunHandler(n, value, sig, state);

        let newValue = state.cache[target];
        if (state.gives.includes(target) && oldValue !== newValue) {
            sig('output', { target, val: newValue });
        }
    };

    // Custom route function - returns dispatch policy for output signals
    let route = (intent, state) => {
        if (intent.name === 'output') {
            let { target, val } = intent.value;

            // Build dispatch targets from wires
            let targets = [];
            for (let wire of state.wires) {
                if (wire.from === target) {
                    targets.push({
                        kernel: wire.targetBlock._.kernel,
                        name: 'input',
                        value: { target: wire.to, val }
                    });
                }
            }

            if (targets.length > 0) {
                return { type: 'dispatch', targets };
            }
            return 'drop';  // no wires for this output
        }

        // Default routing for other signals
        let handler = handlers[intent.name];
        if (!handler) return 'drop';
        if (typeof handler === 'function') return 'deferred';
        return handler.policy || 'deferred';
    };

    // Create kernel with custom route
    let k = kernel({
        state,
        handlers,
        route
    });

    // Define initial values
    for (let n of needs) {
        if (!(n in initialValues)) {
            state.cache[n] = undefined;
        }
    }

    for (let n of Object.keys(initialValues)) {
        k.sig('define', { target: n, val: initialValues[n] });
    }

    k.run();

    function wire(fromName, targetBlock, toName) {
        state.wires.push({
            from: fromName,
            targetBlock: targetBlock,
            to: toName || fromName
        });
    }

    function set(target, val) {
        k.sig('set', { target, val });
        k.run();
    }

    function get(target) {
        return k.sig('get', { target, parent: null });
    }

    return {
        name,
        needs,
        gives,
        wire,
        set,
        get,
        sig: k.sig,
        run: k.run,
        _: { state, kernel: k }
    };
}

/**
 * Wire multiple blocks together by matching names
 */
function autoWire(blocks) {
    let givers = {};
    for (let b of blocks) {
        for (let g of b.gives) {
            if (!givers[g]) givers[g] = [];
            givers[g].push(b);
        }
    }

    for (let b of blocks) {
        for (let n of b.needs) {
            if (givers[n]) {
                for (let giver of givers[n]) {
                    if (giver !== b) {
                        giver.wire(n, b, n);
                    }
                }
            }
        }
    }
}

/**
 * Run all blocks until stable
 */
function runAll(blocks, limit = 100) {
    let steps = 0;
    let activity = true;

    while (activity && steps < limit) {
        activity = false;
        for (let b of blocks) {
            if (b._.kernel.queue.length > 0) {
                b.run();
                activity = true;
            }
        }
        steps++;
    }

    return steps;
}

export { block, autoWire, runAll };
