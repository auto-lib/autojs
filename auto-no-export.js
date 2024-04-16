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
    let fn = {};
    let value = {};
    let stack = [];
    let fatal = {};
    let subs = {};
    let trace = {};
    let tnode = {};
    let trace_fn = opt && opt.trace;
    let count = opt && opt.count;
    let counts = {};
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
    let show_vars = (name) => console.log('EXCEPTION in '+name,get_vars(name).deps);
    let fail = (msg,stop) => {
        fatal.msg = msg;
        fatal.stack = stack.map(s => s);
        let vars = get_vars(stack[stack.length-1],true);
        if (typeof fn['#fatal'] === 'function') fn['#fatal']({msg,res,stack:stack,vars});
    }
    let run_subs = (name) => {
        if (subs[name])
        {
            if (name in watch) console.log('[run subs]',name);
            Object.keys(subs[name]).forEach( tag => subs[name][tag](value[name]))
        }
    }
    let update = (name,src,caller) => {
        if (value[name]) return;
        if (name in watch && caller)
        {
            console.log('updating',name,'because',caller,'called it');
        }
        if (name in watch && src)
        {
            console.log('updating',name,'because',src,'changed');
        }
        if (count) counts[name]['update'] += 1;
        if (fatal.msg) return;
        stack.push(name);
        if (stack.indexOf(name)!==stack.length-1) { fail('circular dependency'); return; }
        deps[name] = {};
        let t0 = performance.now();
        let v = fn[name]();
        if ( !value[name] && !v)
        {
        }
        {
            if (!!v && typeof v.then === 'function')
            {
              value[name] = null;
                v.then( v => {
                    setter(name, v);
                })
            }
            else
            {
                value[name] = v;
                tnode[name] = value[name];
                let t1 = performance.now();
                if (report_lag == -1 || (report_lag && t1-t0 > report_lag)) console.log(name,'took',t1-t0,'ms to complete');
                if (name in watch) console.log('[update]',name,get_vars(name));
                run_subs(name);
            }
        }
        stack.pop();
    }
    let getter = (name, parent) => {
        if (fatal.msg) return;
        if (dynamic_internal.includes(name)) {
            fail(`External read of internal function '${name}'`);
            return;
        }
        if (parent && static_external.includes(name)) {
            fail(`Function '${parent}' tried to access external variable '${name}'`);
            return;
        }
        if (parent) deps[parent][name] = true;
        return value[name];
    }
    let clear = (name) => {
        Object.keys(deps).forEach( dep =>
            Object.keys(deps[dep]).forEach(child => {
                if (child == name && dep in fn)
                {
                    if (dep in value)
                    {
                        if (count) counts[dep]['clear'] += 1;
                        if (dep in watch) console.log('[clear]',dep,'value cleared because dependency',name,'changed');
                        delete(value[dep]);
                        clear(dep);
                    }
                }
            })
        )
    }
    let setter = (name, val) => {
        if (fatal.msg) return;
        if (!(name in value))
        {
            console.trace('ERROR trying to set unknown variable '+name);
            fail('outside code trying to set unknown variable '+name);
            return;
        }
        trace = { name, value: val, result: {} }
        tnode = trace.result;
        if (!value[name] && !val) return;
        if (count && name in counts) counts[name]['setter'] += 1;
        value[name] = val;
        if (name in watch) console.log('[setter]',name,'=',value[name],get_vars(name).deps);
        run_subs(name);
        clear(name);
        Object.keys(fn).forEach( key => {
            if (!(key in value) && key[0] != '#') update(key,name);
        });
        if (trace_fn) trace_fn(trace);
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
            console.trace('EXCEPTION trying to set non-function '+name+' as dynamic value');
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
            console.trace('EXCEPTION trying to set function '+name+' as static value');
            return;
        }
        value[name] = v;
        Object.defineProperty(res, name, {
            get() { return getter(name) },
            set(v) { setter(name, v) }
        })
    }
    let default_fatal = (_) => {
        console.log('FATAL',_._.fatal.msg);
        console.log(' stack',_._.fatal.stack);
        console.log(' _',_);
        console.log(' (there might be an error below too if your function failed as well)');
    }
    let wrap = (res, hash, obj) => {
        Object.keys(obj).forEach(name => {
            if (typeof obj[name] == 'function') setup_dynamic (obj, name, res);
            else setup_static (name, obj[name], res);
            setup_sub(hash, name);
        });
        if (typeof obj['#fatal'] === 'function') fn['#fatal'] = obj['#fatal'];
        else fn['#fatal'] = default_fatal;
    }
    let run_tests = (obj) => {
        Object.keys(obj).forEach(name => {
            if (typeof obj[name] == 'function' && name in tests)
            {
                try {
                    let got = obj[name](tests[name]._);
                    let should = tests[name].output;
                    if (JSON.stringify(got) !== JSON.stringify(should)) {
                        console.log('WARNING test failed for',name);
                        console.log(' should be',should);
                        console.log(' got',got);
                    }
                }
                catch (e) {
                    console.log('EXCEPTION running test for',name,e);
                }
            }
        })
    }
    const res = {
        _: { subs, fn, deps, value, fatal },
        '#': {},
        v: '1.38.28'
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
    run_tests(obj);
    wrap(res, res['#'], obj);
    function print_and_reset_counts() {
        let toprint = Object.keys(counts);
        let totals = toprint.map(name => counts[name]['update'] + counts[name]['setter'] + counts[name]['clear']);
        let sorted = totals.map((v,i) => [v, toprint[i]]).sort((a,b) => b[0]-a[0]);
        if (count.top) sorted = sorted.slice(0,count.top);
        if (count.max) sorted = sorted.filter(v => v[0] > count.max);
        const names = sorted.map(v => v[1]);
        console.log('[access counts]',names.map(name => ({ name, counts: counts[name] })));
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