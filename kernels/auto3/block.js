/**
 * BLOCK - Composable Reactive Blocks
 *
 * A block is a kernel with:
 *   - needs: inputs it expects from outside
 *   - gives: outputs it provides to outside
 *   - Automatic wiring via dispatch policy
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
    state.wires = [];  // outgoing connections

    // Get base reactive handlers
    let handlers = createReactiveHandlers();

    // Add block-specific handlers
    handlers.input = {
        policy: 'deferred',
        handler: (n, value, sig, state) => {
            let { target, val } = value;
            // Input from another block - just set it
            state.cache[target] = val;
            sig('invalidate', target);
        }
    };

    handlers.output = {
        policy: 'deferred',
        handler: (n, value, sig, state) => {
            let { target, val } = value;
            // Send to all wired blocks
            for (let wire of state.wires) {
                if (wire.from === target) {
                    wire.target.sig('input', { target: wire.to, val });
                }
            }
        }
    };

    // Modify set handler to also emit output for 'gives' values
    let originalSetHandler = handlers.set.handler;
    handlers.set.handler = (n, value, sig, state) => {
        originalSetHandler(n, value, sig, state);

        // If this is a 'gives' value, emit output
        let { target, val } = value;
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

        // If this is a 'gives' value and it changed, emit output
        let newValue = state.cache[target];
        if (state.gives.includes(target) && oldValue !== newValue) {
            sig('output', { target, val: newValue });
        }
    };

    // Create kernel
    let k = kernel({
        state,
        handlers
    });

    // Define initial values (needs start as undefined)
    for (let n of needs) {
        if (!(n in initialValues)) {
            state.cache[n] = undefined;
        }
    }

    // Define all provided values/functions
    for (let n of Object.keys(initialValues)) {
        k.sig('define', { target: n, val: initialValues[n] });
    }

    // Run to initialize
    k.run();

    /**
     * Wire this block's output to another block's input
     */
    function wire(fromName, targetBlock, toName) {
        state.wires.push({
            from: fromName,
            target: targetBlock,
            to: toName || fromName  // default to same name
        });
    }

    /**
     * Set an input value (for external use)
     */
    function set(target, val) {
        k.sig('set', { target, val });
        k.run();
    }

    /**
     * Get an output value (for external use)
     */
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
 * blocks that 'give' X automatically wire to blocks that 'need' X
 */
function autoWire(blocks) {
    // Build map of who gives what
    let givers = {};  // name -> [block, ...]
    for (let b of blocks) {
        for (let g of b.gives) {
            if (!givers[g]) givers[g] = [];
            givers[g].push(b);
        }
    }

    // Wire givers to needers
    for (let b of blocks) {
        for (let n of b.needs) {
            if (givers[n]) {
                for (let giver of givers[n]) {
                    if (giver !== b) {  // don't wire to self
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
