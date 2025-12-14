/**
 * AUTO - Nice $.x Syntax
 *
 * Wraps kernel + reactive handlers in a friendly API.
 */

import { kernel } from './kernel.js';
import { createReactiveHandlers, createReactiveState } from './graph.js';

function auto(obj, options = {}) {
    // Create reactive state
    let state = createReactiveState();

    // Create kernel with reactive handlers
    let k = kernel({
        state,
        handlers: createReactiveHandlers()
    });

    // Define all properties
    for (let name of Object.keys(obj)) {
        k.sig('define', { target: name, val: obj[name] });
    }

    // Run to initialize all computed values
    k.run();

    // Build proxy for nice $.x syntax
    let proxy = new Proxy({}, {
        get(_, name) {
            // Special properties
            if (name === '_') {
                return {
                    fn: Object.keys(state.fns),
                    deps: state.deps,
                    value: state.cache,
                    fatal: state.fatal
                };
            }
            if (name === 'flush') {
                return () => k.run();
            }

            // Check for fatal
            if (state.fatal && state.fatal.msg) {
                return undefined;
            }

            // Get value (no parent = external read, no dep tracking)
            return k.sig('get', { target: name, parent: null });
        },

        set(_, name, value) {
            if (state.fatal && state.fatal.msg) return true;

            // Check it's not a computed value
            if (name in state.fns) {
                state.fatal = { msg: `cannot set computed value '${name}'` };
                return true;
            }

            k.sig('set', { target: name, val: value });
            k.run();  // immediate propagation for now
            return true;
        }
    });

    return proxy;
}

export default auto;
export { auto };
