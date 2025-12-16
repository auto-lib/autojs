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
    let use_deep_equal = opt && 'deep_equal' in opt ? opt.deep_equal : true;
    let max_calls_per_second = opt && 'max_calls_per_second' in opt ? opt.max_calls_per_second : 10;
    let call_rate_window = opt && 'call_rate_window' in opt ? opt.call_rate_window : 1000;
    let call_rate_backoff = opt && 'call_rate_backoff' in opt ? opt.call_rate_backoff : 5000;
    let call_rate_debug_count = opt && 'call_rate_debug_count' in opt ? opt.call_rate_debug_count : 10;
    let call_timestamps = {};
    let backed_off_functions = {};
    let debug_updates_remaining = {};
    let current_triggers = [];
    let excessive_calls_collection_period = opt && 'excessive_calls_collection_period' in opt ? opt.excessive_calls_collection_period : 2000;
    let static_value_history_size = opt && 'static_value_history_size' in opt ? opt.static_value_history_size : 30;
    let static_value_history = {};
    let excessive_functions_collected = new Set();
    let excessive_collection_timer = null;
    let collecting_excessive_calls = false;
    let collection_start_time = 0;
    let transaction_log = [];
    let transaction_log_size = 50;
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
    let record_static_change = (name, old_val, new_val) => {
        if (name in fn) return;
        if (!static_value_history[name]) {
            static_value_history[name] = [];
        }
        static_value_history[name].push({
            old: old_val,
            new: new_val,
            timestamp: performance.now()
        });
        if (static_value_history[name].length > static_value_history_size) {
            static_value_history[name] = static_value_history[name].slice(-static_value_history_size);
        }
    }
    let find_root_causes = (fn_name) => {
        let roots = new Set();
        let visited = new Set();
        let traverse = (name) => {
            if (visited.has(name)) return;
            visited.add(name);
            if (!(name in fn)) {
                roots.add(name);
                return;
            }
            if (deps[name]) {
                Object.keys(deps[name]).forEach(dep => traverse(dep));
            }
        };
        traverse(fn_name);
        return Array.from(roots);
    }
    let build_dependency_chain = (root, target) => {
        let chains = [];
        let visited = new Set();
        let dfs = (current, path) => {
            if (visited.has(current)) return;
            if (current === target) {
                chains.push([...path, current]);
                return;
            }
            visited.add(current);
            if (dependents[current]) {
                Object.keys(dependents[current]).forEach(dep => {
                    dfs(dep, [...path, current]);
                });
            }
            visited.delete(current);
        };
        dfs(root, []);
        if (chains.length === 0) return null;
        return chains.sort((a, b) => a.length - b.length)[0];
    }
    let format_value = (val) => {
        if (val === null) return 'null';
        if (val === undefined) return 'undefined';
        if (typeof val === 'string') return `"${val}"`;
        if (typeof val === 'number' || typeof val === 'boolean') return String(val);
        if (Array.isArray(val)) {
            if (val.length === 0) return '[]';
            if (val.length <= 3) return `[${val.map(v => format_value(v)).join(', ')}]`;
            return `[${val.length} items]`;
        }
        if (typeof val === 'object') {
            let keys = Object.keys(val);
            if (keys.length === 0) return '{}';
            if (keys.length <= 3) return `{${keys.join(', ')}}`;
            return `{${keys.length} keys}`;
        }
        return String(val);
    }
    let generate_root_cause_report = () => {
        if (excessive_functions_collected.size === 0) return;
        let root_cause_map = {};
        excessive_functions_collected.forEach(fn_name => {
            let roots = find_root_causes(fn_name);
            roots.forEach(root => {
                if (static_value_history[root] && static_value_history[root].length > 0) {
                    if (!root_cause_map[root]) root_cause_map[root] = [];
                    root_cause_map[root].push(fn_name);
                }
            });
        });
        console.log(`${tag?'['+tag+'] ':''}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`${tag?'['+tag+'] ':''}EXCESSIVE UPDATES DETECTED - Root Cause Analysis`);
        console.log(`${tag?'['+tag+'] ':''}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log('');
        if (Object.keys(root_cause_map).length === 0) {
            console.log(`${tag?'['+tag+'] ':''}No root causes with tracked changes found.`);
            console.log('');
            console.log(`${tag?'['+tag+'] ':''}Affected functions (${excessive_functions_collected.size}):`);
            excessive_functions_collected.forEach(fn_name => {
                console.log(`  ${fn_name}`);
            });
            console.log('');
            console.log(`${tag?'['+tag+'] ':''}This likely means:`);
            console.log(`  - Changes happened during initialization (before tracking started)`);
            console.log(`  - Or updates are triggered by async operations completing`);
            console.log(`  - Or functions are being called internally without setter being called`);
            console.log('');
            console.log(`${tag?'['+tag+'] ':''}All affected functions backed off for ${call_rate_backoff}ms`);
            console.log(`${tag?'['+tag+'] ':''}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
            return;
        }
        let sorted_roots = Object.entries(root_cause_map)
            .sort((a, b) => b[1].length - a[1].length);
        sorted_roots.forEach(([root, affected_fns]) => {
            let history = static_value_history[root] || [];
            let now = performance.now();
            let recent = history.slice(-10);
            let oldest_timestamp = recent.length > 0 ? recent[0].timestamp : now;
            let time_span = now - oldest_timestamp;
            console.log(`${tag?'['+tag+'] ':''}Root Cause: '${root}' (static variable)`);
            console.log(`  ${history.length} changes tracked (showing last ${recent.length})`);
            console.log('');
            if (recent.length > 0) {
                console.log(`  Recent changes to ${root}:`);
                recent.forEach((change, i) => {
                    let ago = (now - change.timestamp).toFixed(1);
                    console.log(`    [${ago}ms ago] ${format_value(change.old)} → ${format_value(change.new)}`);
                });
                console.log('');
            } else {
                console.log(`  (no changes recorded - may have been set before tracking started)`);
                console.log('');
            }
            console.log(`  Affected functions (${affected_fns.length}):`);
            affected_fns.forEach(fn_name => {
                let chain = build_dependency_chain(root, fn_name);
                if (chain && chain.length > 1) {
                    console.log(`    ${chain.join(' → ')}`);
                } else {
                    console.log(`    ${root} → ${fn_name}`);
                }
            });
            console.log('');
        });
        console.log(`${tag?'['+tag+'] ':''}Transaction Activity During Collection:`);
        console.log(`  ${transaction_log.length} transactions in ~${(performance.now() - collection_start_time).toFixed(0)}ms`);
        console.log('');
        let trigger_counts = {};
        transaction_log.forEach(txn => {
            txn.triggers.forEach(t => {
                if (!trigger_counts[t.name]) trigger_counts[t.name] = 0;
                trigger_counts[t.name]++;
            });
        });
        let sorted_triggers = Object.entries(trigger_counts).sort((a, b) => b[1] - a[1]);
        if (sorted_triggers.length > 0) {
            console.log(`  Most frequent triggers:`);
            sorted_triggers.slice(0, 10).forEach(([name, count]) => {
                console.log(`    ${name}: ${count} transactions`);
            });
            console.log('');
        }
        let recent_txns = transaction_log.slice(-10);
        console.log(`  Last ${recent_txns.length} transactions:`);
        recent_txns.forEach(txn => {
            let ago = (performance.now() - txn.timestamp).toFixed(1);
            let trigger_names = txn.triggers.map(t => t.name).join(', ');
            console.log(`    [${ago}ms ago] txn#${txn.id}: ${trigger_names} → ${txn.affected} affected, ${txn.changed} changed`);
            txn.triggers.forEach(t => {
                let val_str = format_value(t.value);
                console.log(`      ${t.name} = ${val_str}`);
            });
        });
        console.log('');
        console.log(`${tag?'['+tag+'] ':''}All affected functions backed off for ${call_rate_backoff}ms`);
        console.log(`${tag?'['+tag+'] ':''}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
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
                excessive_functions_collected.add(name);
                backed_off_functions[name] = true;
                if (!collecting_excessive_calls) {
                    collecting_excessive_calls = true;
                    collection_start_time = performance.now();
                    if (deep_log) console.log(`${tag?'['+tag+'] ':''}[excessive calls] Starting ${excessive_calls_collection_period}ms collection period...`);
                    excessive_collection_timer = setTimeout(() => {
                        generate_root_cause_report();
                        collecting_excessive_calls = false;
                        excessive_functions_collected.clear();
                        transaction_log = [];
                        setTimeout(() => {
                            Object.keys(backed_off_functions).forEach(fn_name => {
                                delete backed_off_functions[fn_name];
                                call_timestamps[fn_name] = [];
                                debug_updates_remaining[fn_name] = call_rate_debug_count;
                            });
                            if (deep_log) console.log(`${tag?'['+tag+'] ':''}Backoff period ended - resuming all functions`);
                        }, call_rate_backoff);
                    }, excessive_calls_collection_period);
                }
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
    let deep_equal = (a, b) => {
        if (a === b) return true;
        if (a == null || b == null) return false;
        if (typeof a !== 'object' || typeof b !== 'object') return false;
        if (Array.isArray(a) && Array.isArray(b)) {
            if (a.length !== b.length) return false;
            for (let i = 0; i < a.length; i++) {
                if (!deep_equal(a[i], b[i])) return false;
            }
            return true;
        }
        if (Array.isArray(a) !== Array.isArray(b)) return false;
        let keysA = Object.keys(a);
        let keysB = Object.keys(b);
        if (keysA.length !== keysB.length) return false;
        for (let key of keysA) {
            if (!keysB.includes(key)) return false;
            if (!deep_equal(a[key], b[key])) return false;
        }
        return true;
    };
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
            let hasChanged;
            let isObject = typeof new_val === 'object' && new_val !== null;
            if (use_deep_equal && isObject) {
                hasChanged = !deep_equal(old_val, new_val);
            } else if (isObject) {
                hasChanged = true;
            } else {
                hasChanged = old_val !== new_val;
            }
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
        if (collecting_excessive_calls) {
            transaction_log.push({
                id: txn_counter,
                timestamp: performance.now(),
                triggers: triggers.map(t => ({ name: t.name, value: t.value })),
                affected: sorted.length,
                changed: actually_changed.size
            });
            if (transaction_log.length > transaction_log_size) {
                transaction_log = transaction_log.slice(-transaction_log_size);
            }
        }
        if (trace_fn) trace_fn(trace);
        return trace;
    }
    let set_internal = (name, val) => {
        if (deep_log) console.log(`${tag?'['+tag+'] ':''}async resolution for ${name}:`,val);
        if (fatal.msg) return;
        let old_val = value[name];
        if (!old_val && !val) {
            if (deep_log) console.log(`${tag?'['+tag+'] ':''}[async skip] ${name} both old and new are falsy`);
            return;
        }
        let hasChanged;
        let isObject = typeof val === 'object' && val !== null;
        if (use_deep_equal && isObject) {
            hasChanged = !deep_equal(old_val, val);
        } else if (isObject) {
            hasChanged = true;
        } else {
            hasChanged = old_val !== val;
        }
        if (!hasChanged) {
            if (deep_log) console.log(`${tag?'['+tag+'] ':''}[async skip] ${name} value hasn't changed`);
            return;
        }
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
        let old_val = value[name];
        value[name] = val;
        record_static_change(name, old_val, val);
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
        v: '1.53.9'
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