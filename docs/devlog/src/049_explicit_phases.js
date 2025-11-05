
// 049: Explicit Phases
//
// Refactoring to make the 8-phase propagation cycle crystal clear.
// Each phase is now a separate, named function.
//
// Benefits:
// 1. Easier to understand the flow
// 2. Easier to debug (can log/instrument each phase)
// 3. Easier to extend (e.g., add recorder hooks)
// 4. Self-documenting code
//
// No behavioral changes - all tests must pass!

// the biggest thing to understand is the distinction between static and
// dynamic values. static values can only be changed from the outside
// where-as dynamic values can only change from the inside, basically

/**
 * @template T
 * @param {T} obj
 * @param {import('../../../types/index.js').AutoOptions} [opt]
 * @returns {import('../../../types/index.js').Auto<T>}
 * @example
 * let auto = require('auto');
 * let obj = {
 *    data: null,
 *   count: ($) => $.data ? $.data : undefined
 * }
 * let _ = auto(obj);
 * _.data; // null
 * _.count; // undefined
 * res.data = [1,2,3];
 * res.count; // 3
*/
let auto = (obj,opt) => {

    let deps = {};       // list of dependencies (dynamic) - deps[a] = {b: true, c: true} means a depends on b and c
    let dependents = {}; // reverse dependency map - dependents[a] = {b: true, c: true} means b and c depend on a
    let fn = {};         // list of functions (dynamic)
    let value = {};      // current values (static and dynamic)
    let stack = [];      // list of call stack (for circular detection)
    let fatal = {};      // only set if fatal error occurs (and everything stops if this is set)
    let subs = {};       // functions to run each time a value changes (static and dynamic)
    let trace = {};      // trace of current transaction
    let tnode = {};

    // Transaction batching and metadata
    let txn_counter = 0;           // global transaction counter
    let in_batch = false;          // are we currently in a batch?
    let batch_triggers = [];       // accumulated triggers during batch
    let batch_changed = new Set(); // all variables changed during batch

    // Auto-batching (timer-based)
    let auto_batch_enabled = opt && 'auto_batch' in opt ? opt.auto_batch : true; // enable automatic batching
    let auto_batch_delay = opt && 'auto_batch_delay' in opt ? opt.auto_batch_delay : 0; // delay in ms (0 = next tick)
    let auto_batch_timer = null;  // pending timer
    let auto_batch_pending = [];  // pending triggers for auto-batch

    let trace_fn = opt && opt.trace; // function to run on each trace
    let count = opt && opt.count; // function to run on each trace
    let counts = {};
    let tag = opt && opt.tag; // string to show in log messages
    let deep_log = opt && opt.deep_log; // if true, log everything to the console (for catestrophic failures)

    if (deep_log) console.log(`${tag?'['+tag+'] ':''}auto started`,obj);

    let static_external = [];
    let static_internal = [];
    let static_mixed = [];

    let dynamic_external = [];
    let dynamic_internal = [];
    let dynamic_mixed = [];

    // if you pass in something like { one: true, two: true }
    // then any time anything happens with either 'one' or 'two'
    // (static or dynamic variables) you will get a log message.

    let watch = opt && 'watch' in opt ? opt.watch : {};
    let report_lag = opt && 'report_lag' in opt ? opt.report_lag : 100; // log a message any time a function takes longer than report_lag milliseconds (default 100)
    let tests = opt && 'tests' in opt ? opt.tests : {}; // before boot run a test

    // used when a function (of a dynamic variable) causes an exception / has an error
    // we print out all the values of the dependent variables of the function
    // as well as the dependents of those variables, recursively, so you can
    // see the entire state tree that led to all the values

    let get_vars = (name,array_only) => {
        let o = { deps: {}, value: value[name] };
        if (name in deps)
            Object.keys(deps[name]).forEach(dep => {
                if (!deps[dep])
                {
                    if (array_only && Array.isArray(value[dep]))
                        o.deps[dep] = `array, length ${value[dep].length}`;
                    else
                        o.deps[dep] = value[dep];
                }
                else {
                    o.deps[dep] = { value: value[dep], deps: {} };
                    Object.keys(deps[dep]).forEach(inner => o.deps[dep].deps[inner] = get_vars(inner)); }
            })
        return o;
    }
    let show_vars = (name) => console.log(`${tag?'['+tag+'] ':''}EXCEPTION in ${name}`,get_vars(name).deps);

    // ------------------------------------------------------
    // THE FIVE RUNTIME FUNCTIONS
    // ------------------------------------------------------

    // == something went wrong ==
    // == save the message/stack and run any subscriptions to this (TODO on subscriptions) ==

    let fail = (msg,stop) => {

        // save out to global object
        // so we can access it from outside for debugging
        // and also update uses this to stop looping during a circle

        fatal.msg = msg;
        fatal.stack = stack.map(s => s); // copy out the call stack
        let vars = get_vars(stack[stack.length-1],true);

        if (typeof fn['#fatal'] === 'function')
        {
            try {
                fn['#fatal']({msg,res,stack:stack,vars});
            } catch (e) {
                console.log(`${tag?'['+tag+'] ':''}EXCEPTION running #fatal function`,e);
                console.log(' stack',stack);
                console.log(' vars',vars);
            }
        }
    }

    // == run any subscriptions to a value ==
    // == static or dynamic ==

    let run_subs = (name) => {
        if (subs[name])
        {
            if (name in watch) console.log(`${tag?'['+tag+'] ':''}[run subs]`,name);
            Object.keys(subs[name]).forEach( tag => subs[name][tag](value[name]))
        }
    }

    // == update a dynamic value ==
    // == never static ==

    let update = (name,src,caller) => {

        if (deep_log&&(src||caller)) console.log(`${tag?'['+tag+'] ':''}updating ${name}`,src?'because '+src:'',caller?'called by '+caller:'');

        if (value[name]) return;

        if (name in watch && caller)
        {
            console.log(`${tag?'['+tag+'] ':''}updating ${name}`,'because',caller,'called it');
        }

        if (name in watch && src)
        {
            console.log(`${tag?'['+tag+'] ':''}updating ${name}`,'because',src,'changed');
        }

        if (count) counts[name]['update'] += 1;

        if (fatal.msg) return;

        stack.push(name);
        if (stack.indexOf(name)!==stack.length-1) { fail('circular dependency'); return; }

        // Clear old dependencies from both maps
        if (deps[name]) {
            Object.keys(deps[name]).forEach(dep => {
                if (dependents[dep] && dependents[dep][name]) {
                    delete dependents[dep][name];
                }
            });
        }
        deps[name] = {};

        let t0 = performance.now();

        let v = fn[name]();

        if ( !value[name] && !v)
        {
        }
        {
            if (!!v && typeof v.then === 'function')
            {
              value[name] = v;
                v.then( v => {
                    set_internal(name, v);
                })
            }
            else
            {
                value[name] = v;

                tnode[name] = value[name];

                let t1 = performance.now();
                if (report_lag == -1 || (report_lag && t1-t0 > report_lag)) console.log(`${tag?'['+tag+'] ':''} ${name}`,'took',t1-t0,'ms to complete');

                if (name in watch) console.log(`${tag?'['+tag+'] ':''}[update]`,name,get_vars(name));
            }
        }

        stack.pop();
    }

    let getter = (name, parent) => {
        if (deep_log) console.log(`${tag?'['+tag+'] ':''}getting ${name}`,parent?'called by '+parent:'');

        if (fatal.msg)
        {
            if (deep_log) console.log(`${tag?'['+tag+'] ':''}fatal error, not getting ${name}`);
            return;
        }

        // Auto-flush: if there are pending auto-batch changes and this is an external read,
        // flush them immediately to prevent reading stale values
        if (!parent && auto_batch_pending.length > 0) {
            if (deep_log) console.log(`${tag?'['+tag+'] ':''}[auto-flush] flushing ${auto_batch_pending.length} pending changes before read of ${name}`);
            if (auto_batch_timer !== null) {
                clearTimeout(auto_batch_timer);
            }
            flush_auto_batch();
        }

        if (dynamic_internal.includes(name)) {
            fail(`External read of internal function '${name}'`);
            return;
        }

        if (parent && static_external.includes(name)) {
            fail(`Function '${parent}' tried to access external variable '${name}'`);
            return;
        }

        if (parent) {
            deps[parent][name] = true;
            if (!dependents[name]) dependents[name] = {};
            dependents[name][parent] = true;
        }

        return value[name];
    }

    // ------------------------------------------------------
    // PROPAGATION HELPER FUNCTIONS (for the 8 phases)
    // ------------------------------------------------------

    /**
     * Phase 1: Invalidate
     * Mark all values affected by a change (recursively find dependents)
     */
    let phase1_invalidate = (trigger_name, affected) => {
        if (!affected) affected = new Set();

        if (deep_log) console.log(`${tag?'['+tag+'] ':''}[phase 1: invalidate]`,trigger_name);

        if (dependents[trigger_name]) {
            Object.keys(dependents[trigger_name]).forEach(dep => {
                if (dep in fn && dep in value) {
                    if (count) counts[dep]['clear'] += 1;
                    if (dep in watch) console.log(`${tag?'['+tag+'] ':''}[invalidate]`,dep,'invalidated because dependency',trigger_name,'changed');

                    affected.add(dep);
                    phase1_invalidate(dep, affected);
                }
            });
        }

        return affected;
    }

    /**
     * Phase 2: Topological Sort
     * Order variables by dependencies so deps compute before dependents
     */
    let phase2_topological_sort = (variables) => {
        if (deep_log) console.log(`${tag?'['+tag+'] ':''}[phase 2: topological sort]`, Array.from(variables));

        let sorted = [];
        let visited = new Set();
        let visiting = new Set();
        let path = [];

        let visit = (name) => {
            if (visited.has(name)) return;
            if (visiting.has(name)) {
                // Circular dependency detected in dependency graph
                // This is rare since deps are computed during runtime
                // Most circulars are caught in update() during evaluation
                path.push(name);
                if (deep_log) console.log(`${tag?'['+tag+'] ':''}structural circular dependency:`, path);
                return;
            }

            visiting.add(name);
            path.push(name);

            // Visit all dependencies first
            if (name in deps) {
                Object.keys(deps[name]).forEach(dep => {
                    if (variables.has(dep)) {
                        visit(dep);
                    }
                });
            }

            path.pop();
            visiting.delete(name);
            visited.add(name);
            sorted.push(name);
        };

        // Visit each variable in the set
        variables.forEach(name => visit(name));

        if (deep_log) console.log(`${tag?'['+tag+'] ':''}[phase 2: result]`, sorted);

        return sorted;
    }

    /**
     * Phase 3: Capture Old Values
     * Save current values for change detection
     */
    let phase3_capture_old_values = (sorted) => {
        if (deep_log) console.log(`${tag?'['+tag+'] ':''}[phase 3: capture old values]`);

        let old_values = {};
        sorted.forEach(name => {
            if (name in value) {
                old_values[name] = value[name];
            }
        });

        return old_values;
    }

    /**
     * Phase 4: Clear Values
     * Delete values to mark them for recomputation
     */
    let phase4_clear_values = (sorted) => {
        if (deep_log) console.log(`${tag?'['+tag+'] ':''}[phase 4: clear values]`);

        sorted.forEach(name => {
            if (name in value) {
                delete value[name];
            }
        });
    }

    /**
     * Phase 5: Recompute
     * Trigger updates in dependency order
     */
    let phase5_recompute = (sorted, txn_id) => {
        if (deep_log) console.log(`${tag?'['+tag+'] ':''}[phase 5: recompute]`);

        sorted.forEach(name => {
            if (name in fn && !(name in value)) {
                update(name, txn_id);
            }
        });
    }

    /**
     * Phase 6: Detect Changes
     * Compare old vs new to find actual changes
     */
    let phase6_detect_changes = (triggers, sorted, old_values) => {
        if (deep_log) console.log(`${tag?'['+tag+'] ':''}[phase 6: detect changes]`);

        let actually_changed = new Set();

        // Triggers always count as changed (they were set externally)
        triggers.forEach(t => actually_changed.add(t.name));

        // For computed values, check if value actually changed
        // Only check === for primitives; objects/arrays always count as changed
        sorted.forEach(name => {
            let old_val = old_values[name];
            let new_val = value[name];

            // Objects/arrays (except null) always count as changed (might be mutated)
            // Primitives use === comparison
            let isObject = typeof new_val === 'object' && new_val !== null;
            let hasChanged = isObject || old_val !== new_val;

            if (hasChanged) {
                actually_changed.add(name);
                if (deep_log) {
                    if (isObject) {
                        console.log(`${tag?'['+tag+'] ':''}[object changed] ${name}:`, old_val, '->', new_val);
                    } else {
                        console.log(`${tag?'['+tag+'] ':''}[change detected] ${name}:`, old_val, '->', new_val);
                    }
                }
            } else {
                if (deep_log) console.log(`${tag?'['+tag+'] ':''}[no change] ${name}:`, old_val);
            }
        });

        return actually_changed;
    }

    /**
     * Phase 7: Build Trace
     * Record what changed in the transaction trace
     */
    let phase7_build_trace = (triggers, actually_changed, txn_id) => {
        if (deep_log) console.log(`${tag?'['+tag+'] ':''}[phase 7: build trace]`);

        trace = {
            id: txn_id,
            timestamp: Date.now(),
            triggers: triggers,
            updates: {}
        };

        actually_changed.forEach(name => {
            trace.updates[name] = value[name];
        });

        tnode = trace.updates;

        return trace;
    }

    /**
     * Phase 8: Notify Subscriptions
     * Run subscription callbacks for changed values
     */
    let phase8_notify_subscriptions = (actually_changed) => {
        if (deep_log) console.log(`${tag?'['+tag+'] ':''}[phase 8: notify subscriptions]`);

        actually_changed.forEach(name => {
            if (name in subs) {
                run_subs(name);
            }
        });
    }

    /**
     * PROPAGATE: The Orchestrator
     * Coordinates all 8 phases
     */
    let propagate = (triggers) => {
        // Normalize to array format
        if (!Array.isArray(triggers)) {
            triggers = [triggers];
        }

        txn_counter += 1;

        if (deep_log) console.log(`${tag?'['+tag+'] ':''}[txn ${txn_counter}] propagating changes from`, triggers.map(t => t.name).join(', '));

        // Phase 1: Invalidate - find all affected variables from ALL triggers
        let affected = new Set();
        triggers.forEach(trigger => {
            let trigger_affected = phase1_invalidate(trigger.name);
            trigger_affected.forEach(name => affected.add(name));
        });

        // Phase 2: Sort - order by dependencies (if any affected)
        let sorted = affected.size > 0 ? phase2_topological_sort(affected) : [];

        // Phase 3: Capture old values for change detection
        let old_values = phase3_capture_old_values(sorted);

        // Phase 4: Clear values (mark for recomputation)
        phase4_clear_values(sorted);

        // Phase 5: Recompute in dependency order
        phase5_recompute(sorted, 'txn_' + txn_counter);

        // Phase 6: Detect what actually changed
        let actually_changed = phase6_detect_changes(triggers, sorted, old_values);

        // Phase 7: Build transaction trace
        let trace = phase7_build_trace(triggers, actually_changed, txn_counter);

        // Phase 8: Notify subscriptions for changed values
        phase8_notify_subscriptions(actually_changed);

        // Call user's trace function
        if (trace_fn) trace_fn(trace);

        return trace;
    }

    // == internal setter: update a dynamic value after async resolution ==
    // == doesn't create a new transaction, just updates value and propagates ==

    let set_internal = (name, val) => {

        if (deep_log) console.log(`${tag?'['+tag+'] ':''}async resolution for ${name}:`,val);

        if (fatal.msg) return;

        value[name] = val;

        if (name in watch) console.log(`${tag?'['+tag+'] ':''}[async resolved]`,name,'=',value[name]);

        // Propagate changes to dependents (with transaction trace)
        propagate({ name, value: val });
    }

    // == flush auto-batch: process accumulated auto-batch triggers ==

    let flush_auto_batch = () => {
        if (auto_batch_pending.length === 0) return;

        if (deep_log) console.log(`${tag?'['+tag+'] ':''}[auto-batch] flushing ${auto_batch_pending.length} triggers`);

        let triggers = auto_batch_pending;
        auto_batch_pending = [];
        auto_batch_timer = null;

        // Propagate all accumulated triggers as one transaction
        propagate(triggers);
    };

    // == set a static value ==
    // == triggers propagation through dependent values ==
    // == can participate in explicit batching or auto-batching ==

    let setter = (name, val) => {

        if (deep_log) console.log(`${tag?'['+tag+'] ':''}setting ${name} to`,val);

        if (fatal.msg) return;
        if (!(name in value))
        {
            console.trace(`${tag?'['+tag+'] ':''}ERROR trying to set unknown variable ${name}`);
            fail('outside code trying to set unknown variable '+name);
            return;
        }

        if (!value[name] && !val) return; // ignore nulls

        // Change detection: if value hasn't changed, don't propagate
        // Only for primitives - objects/arrays might be mutated, so always propagate
        if (value[name] === val && (typeof val !== 'object' || val === null)) {
            if (deep_log) console.log(`${tag?'['+tag+'] ':''}[no change] ${name} already equals`,val);
            return;
        }

        if (count && name in counts) counts[name]['setter'] += 1;

        value[name] = val; // save

        if (name in watch) console.log(`${tag?'['+tag+'] ':''}[setter]`,name,'=',value[name],get_vars(name).deps);

        // Priority 1: If we're in an explicit batch, accumulate
        if (in_batch) {
            batch_triggers.push({ name, value: val });
            batch_changed.add(name);
            if (deep_log) console.log(`${tag?'['+tag+'] ':''}[batch] accumulated ${name}`);
            // Don't propagate yet - wait for batch to complete
        }
        // Priority 2: If auto-batching is enabled, accumulate and schedule flush
        else if (auto_batch_enabled) {
            auto_batch_pending.push({ name, value: val });

            // Clear existing timer and schedule new one
            if (auto_batch_timer !== null) {
                clearTimeout(auto_batch_timer);
            }

            auto_batch_timer = setTimeout(flush_auto_batch, auto_batch_delay);

            if (deep_log) console.log(`${tag?'['+tag+'] ':''}[auto-batch] accumulated ${name}, timer scheduled`);
        }
        // Priority 3: Normal single-set operation - propagate immediately
        else {
            propagate({ name, value: val });
        }
    }

    // --------------------------------------------
    // everything from here down is just setup code
    // --------------------------------------------

    // get an available name for subscription
    // tricky because they can disappear when unsubscribed from

    let get_subtag = (name) => {

        let val = 0;
        let tag = () => val.toString().padStart(3, "0"); // e.g. #012
        while( subs[name] && tag() in subs[name] ) val += 1; // increment until not found
        return tag();
    }

    // setup the subscribe function
    // and add get/set (mostly for svelte integration)

    let setup_sub = (hash, name) => {

        // we access this with something like _['#'].data.subscribe( (v) => console.log('data:',v); )
        hash[name] = {}
        hash[name].get = () => getter(name);
        hash[name].set = (v) => setter(name, v);
        hash[name].subscribe = (f) => {

            // run the function immediately on latest value
            f(value[name]);

            // you can subscribe multiple times
            // so we need to get a unique code for each one
            let subtag = get_subtag(name);

            // save sub function
            if (!subs[name]) subs[name] = {};
            subs[name][subtag] = (v) => f(v);

            // return unsubscribe method
            return () => { delete(subs[name][subtag]); }
        };
    }

    // setup a dynamic value
    // called from wrap() below

    let setup_dynamic = (obj, name, res) => {

        if (typeof obj[name] != 'function') {
            console.trace(`${tag?'['+tag+'] ':''}EXCEPTION trying to set non-function ${name} as dynamic value`);
        }

        // this is kind of magic
        // each function gets it's own special global object
        // which called getter with it's own name as the parent parameter

        let _ = new Proxy({}, {
            get(target, prop) {
                if (!(prop in value)) {
                    if (prop in fn) update(prop,null,name);
                    else { fail('function '+name+' is trying to access non-existent variable '+prop); return undefined; }
                }
                return getter(prop,name);
            },
            set(target, prop, value) {
                fail('function '+name+' is trying to change value '+prop);
                return true;
            }
        });

        // this is how we would do the above without Proxy.
        // the reason I used Proxy is you can then detect
        // accessing non-existent variable names

        // Object.keys(obj).forEach(
        //     child => Object.defineProperty(_, child, {

        //         // this is the get/set _inside_ a function
        //         get() { return getter(child, name); },
        //         set(v) { fail('function '+name+' is trying to change value '+child);  }

        //     }));

        // here we pass in the specially modified global object to the function
        // and also throw in the set parameter for async functions

        fn[name] = () => {
            if (fatal.msg) return;

            // run the function and catch any error,
            // printing out all the dependent variables if
            // it does

            let v; try { v = obj[name](_, (v) => setter(name, v) ); }
            catch(e) { show_vars(name); if (!fatal.msg) fail({msg:`exception in ${name}`, e}); console.log(e); }

            return v;
        }

        // this is getting the function itself (outside, kind-of)
        Object.defineProperty(res, name, {
            get() { return getter(name) }
        } )
    }

    // setup a static value
    // called from wrap() below

    let setup_static = (name, v, res) => {
        if (typeof v == 'function') {
            console.trace(`${tag?'['+tag+'] ':''}EXCEPTION trying to set function ${name} as static value`);
            return;
        }

        // save whatever was defined originally
        value[name] = v;

        // use our functions for get/set
        Object.defineProperty(res, name, {
            get() { return getter(name) },
            set(v) { setter(name, v) }
        })
    }

    // nothing happens when a fatal error occurs really so the
    // tests are cleaner but also it's pluggable so you can
    // respond however you want. this is set by default for the browser

    let default_fatal = (_) => {
        console.log(`${tag?'['+tag+'] ':''}FATAL`,_._.fatal.msg);
        console.log(' stack',_._.fatal.stack);
        console.log(' _',_);
        console.log(' (there might be an error below too if your function failed as well)');
    }

    // called once on the root object

    let wrap = (res, hash, obj) => {
        if (deep_log) console.log(`${tag?'['+tag+'] ':''}wrapping object`,obj);

        // add handler that prints out to console for convenience in browser
        // if (!obj['#fatal']) fn['#fatal'] = default_fatal;

        // loop through each key
        Object.keys(obj).forEach(name => {

            // setup dynamic/static
            if (typeof obj[name] == 'function') setup_dynamic (obj, name, res);
            else setup_static (name, obj[name], res);

            // create subscribable object
            setup_sub(hash, name);
        });

        if (typeof obj['#fatal'] === 'function') fn['#fatal'] = obj['#fatal'];
        else fn['#fatal'] = () => default_fatal(res);
    }

    let run_tests = (obj) => {
        if (deep_log) console.log(`${tag?'['+tag+'] ':''}running tests`,tests);

        Object.keys(obj).forEach(name => {
            if (typeof obj[name] == 'function' && name in tests)
            {
                try {
                    let got = obj[name](tests[name]._);
                    let should = tests[name].output;
                    if (JSON.stringify(got) !== JSON.stringify(should)) {
                        console.log(`${tag?'['+tag+'] ':''}WARNING test failed for ${name}`);
                        console.log(' should be',should);
                        console.log(' got',got);
                    }
                }
                catch (e) {
                    console.log(`${tag?'['+tag+'] ':''}EXCEPTION running test for`,name,e);
                }
            }
        })
    }

    // the object we will access from the outside
    // gives access to the internals via _
    // and subscribable versions of each value via '#'

    const res = {                             // return object
        _: { subs, fn, deps, value, fatal },  // so we can see from the outside what's going on
        '#': {},                               // subscribe methods for each member
        v: undefined                            // version number of this lib
    };

    res.add_static = (inner_obj) => {
        Object.keys(inner_obj).forEach(name => {
            setup_static(name, inner_obj[name], res);
            setup_sub(res['#'], name);
        })
    }

    res.add_dynamic = (inner_obj) => {
        Object.keys(inner_obj).forEach(name => {
            setup_dynamic(inner_obj, name, res);
            setup_sub(res['#'], name);
        })

        Object.keys(inner_obj).forEach(name => {
            update(name);
        })
    }

    let add_fn = (inner_obj, fn, arr) => {
        res[fn](inner_obj);
        Object.keys(inner_obj).forEach(name => arr.push(name));
    }

    res.add_static_external = (inner_obj) => add_fn(inner_obj, 'add_static', static_external);
    res.add_static_internal = (inner_obj) => add_fn(inner_obj, 'add_static', static_internal);
    res.add_static_mixed = (inner_obj) => add_fn(inner_obj, 'add_static', static_mixed);

    res.add_dynamic_external = (inner_obj) => add_fn(inner_obj, 'add_dynamic', dynamic_external);
    res.add_dynamic_internal = (inner_obj) => add_fn(inner_obj, 'add_dynamic', dynamic_internal);
    res.add_dynamic_mixed = (inner_obj) => add_fn(inner_obj, 'add_dynamic', dynamic_mixed);

    // == flush: immediately process pending auto-batch ==
    // == Useful for testing or when you need synchronous behavior ==

    res.flush = () => {
        if (auto_batch_timer !== null) {
            clearTimeout(auto_batch_timer);
            flush_auto_batch();
        }
    };

    // == batch API: group multiple sets into one transaction ==
    // == Usage: $.batch(() => { $.data = x; $.filter = y; }) ==
    // == Creates ONE transaction with multiple triggers ==

    res.batch = (fn) => {
        if (in_batch) {
            fn();
            return;
        }

        if (deep_log) console.log(`${tag?'['+tag+'] ':''}[batch] starting`);

        in_batch = true;
        batch_triggers = [];
        batch_changed = new Set();

        try {
            fn();

            if (deep_log) console.log(`${tag?'['+tag+'] ':''}[batch] complete with ${batch_triggers.length} triggers:`, batch_triggers.map(t => t.name));

            in_batch = false;

            if (batch_triggers.length > 0) {
                return propagate(batch_triggers);
            }
        } catch (e) {
            in_batch = false;
            batch_triggers = [];
            batch_changed = new Set();
            throw e;
        }
    };

    run_tests(obj);

    wrap(res, res['#'], obj);

    function print_and_reset_counts() {
        let toprint = Object.keys(counts);
        let totals = toprint.map(name => counts[name]['update'] + counts[name]['setter'] + counts[name]['clear']);
        let sorted = totals.map((v,i) => [v, toprint[i]]).sort((a,b) => b[0]-a[0]);
        if (count.top) sorted = sorted.slice(0,count.top);
        if (count.max) sorted = sorted.filter(v => v[0] > count.max);

        const names = sorted.map(v => v[1]);
        console.log(`${tag?'['+tag+'] ':''}[access counts]`,names.map(name => ({ name, counts: counts[name] })));

        counts = {};
        Object.keys(fn).forEach(name => {
            counts[name] = { update: 0, setter: 0, clear: 0 };
        })
    }

    if (count)
    {
        counts = {};
        Object.keys(fn).forEach(name => {
            counts[name] = { update: 0, setter: 0, clear: 0 };
        })
        if (count.repeat) setInterval(print_and_reset_counts, count.interval);
        else setTimeout(print_and_reset_counts, count.interval);
    }

    Object.keys(fn).forEach(name => {
        if (name[0] != '#'){
            value[name] = undefined;
            update(name);
        }
    });

    return res;
}

// module.exports = auto;
