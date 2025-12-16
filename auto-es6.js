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
 * _.data;
 * _.count;
 * res.data = [1,2,3];
 * res.count;
*/
let auto = (obj,opt) => {
    let deps = {};
    let dependents = {};
    let fn = {};
    let value = {};
    let stack = [];
    let fatal = {};
    let subs = {};
    let trace = {};
    let tnode = {};
    let txn_counter = 0;
    let in_batch = false;
    let batch_triggers = [];
    let batch_changed = new Set();
    let auto_batch_enabled = opt && 'auto_batch' in opt ? opt.auto_batch : true;
    let auto_batch_delay = opt && 'auto_batch_delay' in opt ? opt.auto_batch_delay : 0;
    let auto_batch_timer = null;
    let auto_batch_pending = [];
    let trace_fn = opt && opt.trace;
    let count = opt && opt.count;
    let counts = {};
    let tag = opt && opt.tag;
    let deep_log = opt && opt.deep_log;
    if (deep_log) console.log(`${tag?'['+tag+'] ':''}auto started`,obj);
    let static_external = [];
    let static_internal = [];
    let static_mixed = [];
    let dynamic_external = [];
    let dynamic_internal = [];
    let dynamic_mixed = [];
    let watch = opt && 'watch' in opt ? opt.watch : {};
    let report_lag = opt && 'report_lag' in opt ? opt.report_lag : 100;
    let tests = opt && 'tests' in opt ? opt.tests : {};
    let max_calls_per_second = opt && 'max_calls_per_second' in opt ? opt.max_calls_per_second : 10;
    let call_rate_window = opt && 'call_rate_window' in opt ? opt.call_rate_window : 1000;
    let call_rate_backoff = opt && 'call_rate_backoff' in opt ? opt.call_rate_backoff : 5000;
    let call_rate_debug_count = opt && 'call_rate_debug_count' in opt ? opt.call_rate_debug_count : 10;
    let call_timestamps = {};
    let backed_off_functions = {};
    let debug_updates_remaining = {};
    let current_triggers = [];
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
    let fail = (msg,stop,details) => {
        fatal.msg = msg;
        fatal.stack = stack.map(s => s);
        if (details) fatal.details = details;
        let vars = get_vars(stack[stack.length-1],true);
        if (typeof fn['#fatal'] === 'function')
        {
            try {
                fn['#fatal']({msg,res,stack:stack,vars,details});
            } catch (e) {
                console.log(`${tag?'['+tag+'] ':''}EXCEPTION running #fatal function`,e);
                console.log(' stack',stack);
                console.log(' vars',vars);
                if (details) console.log(' details',details);
            }
        }
    }
    let run_subs = (name) => {
        if (subs[name])
        {
            if (name in watch) console.log(`${tag?'['+tag+'] ':''}[run subs]`,name);
            Object.keys(subs[name]).forEach( tag => subs[name][tag](value[name]))
        }
    }
    let check_call_rate = (name) => {
        if (!max_calls_per_second) return;
        let now = performance.now();
        if (!call_timestamps[name]) {
            call_timestamps[name] = [];
        }
        call_timestamps[name].push(now);
        let window_start = now - call_rate_window;
        call_timestamps[name] = call_timestamps[name].filter(t => t >= window_start);
        if (call_timestamps[name].length > max_calls_per_second) {
            if (!backed_off_functions[name]) {
                console.log(`${tag?'['+tag+'] ':''}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
                console.log(`${tag?'['+tag+'] ':''}EXCESSIVE CALLS detected for function '${name}'`);
                console.log(`  calls: ${call_timestamps[name].length} in ${call_rate_window}ms (threshold: ${max_calls_per_second})`);
                console.log(`  stack:`, stack);
                if (deps[name] && Object.keys(deps[name]).length > 0) {
                    console.log(`  dependencies:`, Object.keys(deps[name]));
                    console.log(`  current values:`, Object.keys(deps[name]).reduce((acc, dep) => {
                        acc[dep] = value[dep];
                        return acc;
                    }, {}));
                } else {
                    console.log(`  dependencies: none`);
                }
                if (dependents[name] && Object.keys(dependents[name]).length > 0) {
                    console.log(`  affects:`, Object.keys(dependents[name]));
                }
                console.log(`  backing off for ${call_rate_backoff}ms`);
                console.log(`  will log next ${call_rate_debug_count} updates after backoff to help debug`);
                console.log(`${tag?'['+tag+'] ':''}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
                backed_off_functions[name] = true;
                setTimeout(() => {
                    delete backed_off_functions[name];
                    call_timestamps[name] = [];
                    debug_updates_remaining[name] = call_rate_debug_count;
                    console.log(`${tag?'['+tag+'] ':''}Backoff period ended for '${name}' - resuming updates (will log next ${call_rate_debug_count} updates)`);
                }, call_rate_backoff);
            }
        }
    }
    let update = (name,src,caller) => {
        if (deep_log&&(src||caller)) console.log(`${tag?'['+tag+'] ':''}updating ${name}`,src?'because '+src:'',caller?'called by '+caller:'');
        if (value[name]) return;
        if (backed_off_functions[name]) {
            if (deep_log) console.log(`${tag?'['+tag+'] ':''}skipping ${name} - in backoff mode`);
            return;
        }
        if (debug_updates_remaining[name] && debug_updates_remaining[name] > 0) {
            console.log(`${tag?'['+tag+'] ':''}[DEBUG] update #${call_rate_debug_count - debug_updates_remaining[name] + 1} for '${name}'`);
            if (deps[name] && Object.keys(deps[name]).length > 0) {
                let triggering_deps = current_triggers
                    .map(t => t.name)
                    .filter(t => t in deps[name]);
                if (triggering_deps.length > 0) {
                    console.log(`  triggered by:`, triggering_deps);
                    triggering_deps.forEach(dep => {
                        let trigger = current_triggers.find(t => t.name === dep);
                        if (trigger) {
                            console.log(`    ${dep} = ${JSON.stringify(trigger.value)}`);
                        }
                    });
                } else {
                    console.log(`  triggered by: indirect dependency change`);
                }
            }
            debug_updates_remaining[name]--;
            if (debug_updates_remaining[name] === 0) {
                delete debug_updates_remaining[name];
                console.log(`${tag?'['+tag+'] ':''}[DEBUG] logging complete for '${name}'`);
            }
        }
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
        check_call_rate(name);
        if (fatal.msg) return;
        if (stack.indexOf(name)!==stack.length-1) { fail('circular dependency'); return; }
        if (deps[name]) {
            Object.keys(deps[name]).forEach(dep => {
                if (dependents[dep] && dependents[dep][name]) {
                    delete dependents[dep][name];
                }
            });
        }
        deps[name] = {};
        let t0 = performance.now();
        let result = fn[name]();
        if (result && typeof result.then === 'function') {
            value[name] = result;
            result.then(resolved_value => {
                set_internal(name, resolved_value);
            });
        }
        else {
            value[name] = result;
            let t1 = performance.now();
            if (report_lag == -1 || (report_lag && t1-t0 > report_lag)) {
                console.log(`${tag?'['+tag+'] ':''} ${name}`,'took',t1-t0,'ms to complete');
            }
            if (name in watch) {
                console.log(`${tag?'['+tag+'] ':''}[update]`,name,get_vars(name));
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
                path.push(name);
                if (deep_log) console.log(`${tag?'['+tag+'] ':''}structural circular dependency:`, path);
                return;
            }
            visiting.add(name);
            path.push(name);
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
     * Skip backed-off functions to preserve their last known value
     */
    let phase4_clear_values = (sorted) => {
        if (deep_log) console.log(`${tag?'['+tag+'] ':''}[phase 4: clear values]`);
        sorted.forEach(name => {
            if (name in value && !backed_off_functions[name]) {
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
        triggers.forEach(t => actually_changed.add(t.name));
        sorted.forEach(name => {
            let old_val = old_values[name];
            let new_val = value[name];
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
            if (name in fn) {
                trace.updates[name] = value[name];
            }
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
        if (!Array.isArray(triggers)) {
            triggers = [triggers];
        }
        txn_counter += 1;
        current_triggers = triggers;
        if (deep_log) console.log(`${tag?'['+tag+'] ':''}[txn ${txn_counter}] propagating changes from`, triggers.map(t => t.name).join(', '));
        let affected = new Set();
        triggers.forEach(trigger => {
            let trigger_affected = phase1_invalidate(trigger.name);
            trigger_affected.forEach(name => affected.add(name));
        });
        let sorted = affected.size > 0 ? phase2_topological_sort(affected) : [];
        let old_values = phase3_capture_old_values(sorted);
        phase4_clear_values(sorted);
        phase5_recompute(sorted, 'txn_' + txn_counter);
        let actually_changed = phase6_detect_changes(triggers, sorted, old_values);
        let trace = phase7_build_trace(triggers, actually_changed, txn_counter);
        phase8_notify_subscriptions(actually_changed);
        if (trace_fn) trace_fn(trace);
        return trace;
    }
    let set_internal = (name, val) => {
        if (deep_log) console.log(`${tag?'['+tag+'] ':''}async resolution for ${name}:`,val);
        if (fatal.msg) return;
        value[name] = val;
        if (name in watch) console.log(`${tag?'['+tag+'] ':''}[async resolved]`,name,'=',value[name]);
        propagate({ name, value: val });
    }
    let flush_auto_batch = () => {
        if (auto_batch_pending.length === 0) return;
        if (deep_log) console.log(`${tag?'['+tag+'] ':''}[auto-batch] flushing ${auto_batch_pending.length} triggers`);
        let triggers = auto_batch_pending;
        auto_batch_pending = [];
        auto_batch_timer = null;
        propagate(triggers);
    };
    let setter = (name, val) => {
        if (deep_log) console.log(`${tag?'['+tag+'] ':''}setting ${name} to`,val);
        if (fatal.msg) return;
        if (!(name in value))
        {
            console.trace(`${tag?'['+tag+'] ':''}ERROR trying to set unknown variable ${name}`);
            fail('outside code trying to set unknown variable '+name);
            return;
        }
        if (!value[name] && !val) return;
        if (value[name] === val && (typeof val !== 'object' || val === null)) {
            if (deep_log) console.log(`${tag?'['+tag+'] ':''}[no change] ${name} already equals`,val);
            return;
        }
        if (count && name in counts) counts[name]['setter'] += 1;
        value[name] = val;
        if (name in watch) console.log(`${tag?'['+tag+'] ':''}[setter]`,name,'=',value[name],get_vars(name).deps);
        if (in_batch) {
            batch_triggers.push({ name, value: val });
            batch_changed.add(name);
            if (deep_log) console.log(`${tag?'['+tag+'] ':''}[batch] accumulated ${name}`);
        }
        else if (auto_batch_enabled) {
            auto_batch_pending.push({ name, value: val });
            if (auto_batch_timer !== null) {
                clearTimeout(auto_batch_timer);
            }
            auto_batch_timer = setTimeout(flush_auto_batch, auto_batch_delay);
            if (deep_log) console.log(`${tag?'['+tag+'] ':''}[auto-batch] accumulated ${name}, timer scheduled`);
        }
        else {
            propagate({ name, value: val });
        }
    }
    let get_subtag = (name) => {
        let val = 0;
        let tag = () => val.toString().padStart(3, "0");
        while( subs[name] && tag() in subs[name] ) val += 1;
        return tag();
    }
    let setup_sub = (hash, name) => {
        hash[name] = {}
        hash[name].get = () => getter(name);
        hash[name].set = (v) => setter(name, v);
        hash[name].subscribe = (f) => {
            f(value[name]);
            let subtag = get_subtag(name);
            if (!subs[name]) subs[name] = {};
            subs[name][subtag] = (v) => f(v);
            return () => { delete(subs[name][subtag]); }
        };
    }
    let setup_dynamic = (obj, name, res) => {
        if (typeof obj[name] != 'function') {
            console.trace(`${tag?'['+tag+'] ':''}EXCEPTION trying to set non-function ${name} as dynamic value`);
        }
        let _ = new Proxy({}, {
            get(target, prop) {
                if (!(prop in value)) {
                    if (prop in fn) {
                        update(prop, null, name);
                    }
                    else {
                        fail('function '+name+' is trying to access non-existent variable '+prop);
                        return undefined;
                    }
                }
                return getter(prop, name);
            },
            set(target, prop, value) {
                fail('function '+name+' is trying to change value '+prop);
                return true;
            }
        });
        fn[name] = () => {
            if (fatal.msg) return;
            let result;
            try {
                result = obj[name](_, (async_value) => setter(name, async_value));
            }
            catch(e) {
                show_vars(name);
                if (!fatal.msg) fail({msg:`exception in ${name}`, e});
                console.log(e);
            }
            return result;
        }
        Object.defineProperty(res, name, {
            get() { return getter(name) }
        } )
    }
    let setup_static = (name, v, res) => {
        if (typeof v == 'function') {
            console.trace(`${tag?'['+tag+'] ':''}EXCEPTION trying to set function ${name} as static value`);
            return;
        }
        value[name] = v;
        Object.defineProperty(res, name, {
            get() { return getter(name) },
            set(v) { setter(name, v) }
        })
    }
    let default_fatal = (_) => {
        console.log(`${tag?'['+tag+'] ':''}FATAL`,_._.fatal.msg);
        console.log(_._.fatal);
        console.log(' _',_);
        console.log(' (there might be an error below too if your function failed as well)');
    }
    let wrap = (res, hash, obj) => {
        if (deep_log) console.log(`${tag?'['+tag+'] ':''}wrapping object`,obj);
        Object.keys(obj).forEach(name => {
            if (typeof obj[name] == 'function') setup_dynamic (obj, name, res);
            else setup_static (name, obj[name], res);
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
    const res = {
        _: { subs, fn, deps, value, fatal },
        '#': {},
        v: '1.50.0'
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
    res.flush = () => {
        if (auto_batch_timer !== null) {
            clearTimeout(auto_batch_timer);
            flush_auto_batch();
        }
    };
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
            update(name);
        }
    });
    return res;
}

export default auto;