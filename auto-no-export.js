let auto = (obj,opt) => {
    let deps = {};
    let fn = {};
    let value = {};
    let stack = [];
    let fatal = {};
    let subs = {};
    let resolve = {};
    let watch = opt && 'watch' in opt ? opt.watch : {};
    let report_lag = opt && 'report_lag' in opt ? opt.report_lag : 100;
    let tests = opt && 'tests' in opt ? opt.tests : {};
    let parent = opt && 'parent' in opt ? opt.parent : null;
    let get_vars = (name) => {
        let o = { deps: {}, value: value[name] };
        if (name in deps)
            Object.keys(deps[name]).forEach(dep => {
                if (!deps[dep])
                    o.deps[dep] = value[dep];
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
        if (!stop && fn['#fatal']) fn['#fatal'](res);
    }
    let run_subs = (name) => {
        if (subs[name])
            Object.keys(subs[name]).forEach( tag => subs[name][tag](value[name]))
    }
    let update = (name) => {
        if (value[name]) return;
        if (fatal.msg) return;
        stack.push(name);
        if (stack.indexOf(name)!==stack.length-1) { fail('circular dependency'); return; }
        deps[name] = {};
        let t0 = performance.now();
        value[name] = fn[name]();
        let t1 = performance.now();
        if (report_lag == -1 || (report_lag && t1-t0 > report_lag)) console.log(name,'took',t1-t0,'ms to complete');
        if (name in watch) console.log(name,'=',value[name],get_vars(name).deps);
        run_subs(name);
        stack.pop();
    }
    let getter = (name, source) => {
        if (fatal.msg) return;
        if (source) deps[source][name] = true;
        return value[name];
    }
    let clear = (name) => {
        Object.keys(deps).forEach( dep =>
            Object.keys(deps[dep]).forEach(child => {
                if (child == name && dep in fn)
                {
                    delete(value[dep]);
                    clear(dep);
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
        value[name] = val;
        if (name in watch) console.log(name,'=',value[name],get_vars(name).deps);
        run_subs(name);
        clear(name);
        Object.keys(fn).forEach( key => {
            if (!(key in value) && key[0] != '#') update(key);
        });
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
    let check_resolve = (func,name) => {
        let i = func.indexOf('.');
        if (i==-1) return false;
        let tag = func.substr(0,i) + '.' + name
        if (tag in value) {
            if (!(func in resolve)) resolve[func] = {}
            resolve[func][name] = tag;
            return tag;
        }
        if (tag in fn) {
            if (!(func in resolve)) resolve[func] = {}
            resolve[func][name] = tag;
            update(tag);
            return tag;
        }
        return check_resolve(func,name);
    }
    let setup_dynamic = (func, name, res) => {
        let _ = new Proxy({}, {
            get(target, prop) {
                if (name in resolve && prop in resolve[name]) prop = resolve[name][prop];
                if (!(prop in value)) {
                    if (prop in fn) update(prop);
                    else {
                        let rprop = check_resolve(name,prop);
                        if (!rprop)
                            { fail('function '+name+' is trying to access non-existent variable '+prop); return undefined; }
                        prop = rprop;
                    }
                }
                return getter(prop,name);
            },
            set(target, prop, value) {
                fail('function '+name+' is trying to change value '+prop);
            }
        });
        fn[name] = () => {
            if (fatal.msg) return;
            let v; try { v = func(_, (v) => setter(name, v) ); }
            catch(e) { show_vars(name); if (!fatal.msg) fail('exception',true); console.log(e); }
            return v;
        }
        Object.defineProperty(res, name, {
            get() { return getter(name) }
        } )
    }
    let has_function = (obj) => {
        let found = false;
        Object.keys(obj).forEach(key => {
            if (typeof obj[key] == 'function') found = true;
        })
        return found;
    }
    let setup_static = (val, name, res) => {
        value[name] = val;
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
    let is_obj = (obj) => obj != null && typeof obj == 'object' && !Array.isArray(obj);
    let is_fn = (obj) => typeof obj == 'function';
    let is_auto = (obj) => {
        if (!is_obj(obj)) return false;
        let found_fn = false;
        Object.keys(obj).forEach(name => {
            if (is_obj(obj[name])) found_fn = found_fn || is_auto(obj[name]);
            if (is_fn(obj[name])) found_fn = true;
        })
        return found_fn;
    }
    let wrap = (res, hash, obj, pre) => {
        if (!obj['#fatal']) fn['#fatal'] = default_fatal;
        Object.keys(obj).forEach(name => {
            let tag = pre ? pre + '.' + name : name;
            if (typeof obj[name] == 'function') setup_dynamic (obj[name], tag, res);
            else if (is_auto(obj[name]))
            {
                wrap(res, res['#'], obj[name], name);
            }
            else setup_static (obj[name], tag, res);
            setup_sub(hash, name);
        });
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
        _: { subs, fn, deps, value, resolve, fatal },
        '#': {},
        v: '1.36.35',
        append: (obj) => {
            wrap(res, res['#'], obj);
            Object.keys(fn).forEach(name => {
                if (name[0] != '#'){
                    update(name);
                }
            });
        }
    };
    run_tests(obj);
    wrap(res, res['#'], obj);
    Object.keys(fn).forEach(name => {
        if (name[0] != '#'){
            update(name);
        }
    });
    return res;
}