/**
 * AUTO - The Public API
 *
 * Wires kernel (execution) + graph (reactivity) together.
 * Provides the nice $.x syntax.
 */

import { kernel } from './kernel.js';
import { graph } from './graph.js';

function auto(obj, opt = {}) {
    let g = graph();
    let subs = {};  // name -> { tag -> callback }
    let fatal = {};

    // Create kernel with reactive execution
    let k = kernel({
        policy: opt.immediate ? 'immediate' : 'deferred',
        drainDelay: opt.delay || 0,
        execute: (name, value) => {
            try {
                let affected = g.set(name, value);
                g.recompute(affected);

                // Notify subscribers for the changed value
                notifySubs(name);

                // Notify subscribers for affected computed values
                for (let n of affected) {
                    notifySubs(n);
                }
            } catch (e) {
                fatal.msg = e.message;
                fatal.stack = e.stack;
                if (opt.onFatal) {
                    opt.onFatal(e);
                } else {
                    console.log('FATAL:', e.message);
                }
            }
        }
    });

    /**
     * Notify subscribers for a name
     */
    function notifySubs(name) {
        if (subs[name]) {
            let value = g.get(name);
            for (let tag of Object.keys(subs[name])) {
                subs[name][tag](value);
            }
        }
    }

    /**
     * Subscribe to changes on a name
     */
    function subscribe(name, callback) {
        if (!subs[name]) subs[name] = {};
        let tag = Object.keys(subs[name]).length.toString().padStart(3, '0');
        subs[name][tag] = callback;

        // Call immediately with current value
        callback(g.get(name));

        // Return unsubscribe function
        return () => {
            delete subs[name][tag];
        };
    }

    // Define all properties from input object
    for (let name of Object.keys(obj)) {
        g.define(name, obj[name]);
    }

    // Initialize all computed values
    for (let name of Object.keys(obj)) {
        if (typeof obj[name] === 'function') {
            try {
                g.get(name);  // trigger initial computation
            } catch (e) {
                fatal.msg = e.message;
                fatal.stack = e.stack;
                if (opt.onFatal) {
                    opt.onFatal(e);
                } else {
                    console.log('FATAL:', e.message);
                }
            }
        }
    }

    // Build the proxy for nice $.x syntax
    let proxy = new Proxy({}, {
        get(_, name) {
            // Special properties
            if (name === '_') {
                return {
                    ...g._,
                    subs,
                    fatal,
                    queue: k._.queue
                };
            }
            if (name === '#') {
                // Return subscription interface
                let hash = {};
                for (let n of g.keys()) {
                    hash[n] = {
                        get: () => {
                            k.flush();
                            return g.get(n);
                        },
                        set: (v) => k.receive(n, v),
                        subscribe: (cb) => subscribe(n, cb)
                    };
                }
                return hash;
            }
            if (name === 'flush') return k.flush;
            if (name === 'step') return k.step;

            // Check for fatal state
            if (fatal.msg) return undefined;

            // Flush before read to ensure consistency
            k.flush();

            // Check the name exists
            if (!g.has(name)) {
                console.log(`WARNING: accessing undefined variable '${name}'`);
                return undefined;
            }

            return g.get(name);
        },
        set(_, name, value) {
            if (fatal.msg) return true;

            // Check the name exists
            if (!g.has(name)) {
                console.log(`WARNING: setting undefined variable '${name}'`);
                return true;
            }

            // Check it's not a computed value
            if (typeof g._.fns[name] === 'function') {
                fatal.msg = `cannot set computed value '${name}'`;
                if (opt.onFatal) {
                    opt.onFatal(new Error(fatal.msg));
                } else {
                    console.log('FATAL:', fatal.msg);
                }
                return true;
            }

            k.receive(name, value);
            return true;
        }
    });

    return proxy;
}

export default auto;
export { auto };
