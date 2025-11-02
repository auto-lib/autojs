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
    let fail = (msg,stop) => {
        fatal.msg = msg;
        fatal.stack = stack.map(s => s);
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
    let run_subs = (name) => {
        if (subs[name])
        {
            if (name in watch) console.log(`${tag?'['+tag+'] ':''}[run subs]`,name);
            Object.keys(subs[name]).forEach( tag => subs[name][tag](value[name]))
        }
    }
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
    let invalidate = (name, affected) => {
        if (!affected) affected = new Set();
        if (deep_log) console.log(`${tag?'['+tag+'] ':''}invalidating ${name}`);
        if (dependents[name]) {
            Object.keys(dependents[name]).forEach(dep => {
                if (dep in fn && dep in value) {
                    if (count) counts[dep]['clear'] += 1;
                    if (dep in watch) console.log(`${tag?'['+tag+'] ':''}[invalidate]`,dep,'invalidated because dependency',name,'changed');
                    affected.add(dep);
                    invalidate(dep, affected);
                }
            });
        }
        return affected;
    }
    let topological_sort = (variables) => {
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
        return sorted;
    }
    let propagate = (triggers) => {
        if (!Array.isArray(triggers)) {
            triggers = [triggers];
        }
        txn_counter += 1;
        if (deep_log) console.log(`${tag?'['+tag+'] ':''}[txn ${txn_counter}] propagating changes from`, triggers.map(t => t.name).join(', '));
        trace = {
            id: txn_counter,
            timestamp: Date.now(),
            triggers: triggers,
            updates: {}
        };
        tnode = trace.updates;
        let affected = new Set();
        triggers.forEach(trigger => {
            let trigger_affected = invalidate(trigger.name);
            trigger_affected.forEach(name => affected.add(name));
        });
        if (deep_log) console.log(`${tag?'['+tag+'] ':''}[txn ${txn_counter}] affected variables:`, Array.from(affected));
        let sorted = affected.size > 0 ? topological_sort(affected) : [];
        if (sorted.length > 0 && deep_log) console.log(`${tag?'['+tag+'] ':''}[txn ${txn_counter}] update order:`, sorted);
        sorted.forEach(name => {
            if (name in value) {
                delete value[name];
            }
        });
        sorted.forEach(name => {
            if (name in fn && !(name in value)) {
                update(name, 'txn_' + txn_counter);
            }
        });
        sorted.forEach(name => {
            trace.updates[name] = value[name];
        });
        let changed = new Set();
        triggers.forEach(t => changed.add(t.name));
        sorted.forEach(name => changed.add(name));
        changed.forEach(name => {
            if (name in subs) {
                run_subs(name);
            }
        });
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
        fn[name] = () => {
            if (fatal.msg) return;
            let v; try { v = obj[name](_, (v) => setter(name, v) ); }
            catch(e) { show_vars(name); if (!fatal.msg) fail({msg:`exception in ${name}`, e}); console.log(e); }
            return v;
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
        console.log(' stack',_._.fatal.stack);
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
        v: '1.47.13'
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
            value[name] = undefined;
            update(name);
        }
    });
    return res;
}