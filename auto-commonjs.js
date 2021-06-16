let spacer = '';
let logger = (args) => { if (args.length>0) { if(spacer.length>0) args.unshift(spacer); console.log.apply(console,args); }}
let trace_flat = (...args) => { logger(args); }
let trace_in =   (...args) => { logger(args); spacer += '-'; }
let trace_out =  (...args) => { logger(args); spacer = spacer.slice(0,-1); }
let auto = (obj,opt) => {
    let core = {};
    let deps = {};
    let fn = {};
    let value = {};
    let stack = [];
    let called = {};
    let fatal = {};
    let subs = {};
    let trace = opt && opt.trace ? opt.trace : {};
    let watch = opt && opt.watch ? opt.watch : {};
    let trace_wrap = (func, name) => {
        if (name in trace) trace_in(func+' ('+name+')');
        core[func](name);
        if (name in trace) trace_out(); }
    let get_vars = (name) => {
        let o = { deps: {}, value: value[name] };
        if (name in deps) Object.keys(deps[name]).forEach(dep => {
            if (!deps[dep]) o.deps[dep] = value[dep];
            else {
                o.deps[dep] = { value: value[dep], deps: {} };
                Object.keys(deps[dep]).forEach(inner => o.deps[dep].deps[inner] = get_vars(inner));
            }
        })
        return o;
    }
    let show_vars = (name) => console.log('exception in '+name,get_vars(name).deps);
    let fail = (msg) => {
        let _stack = []; stack.forEach(s => _stack.push(s));
        fatal.msg = msg;
        fatal.stack = _stack;
    }
    core.run_subs = (name) => {
        if (subs[name])
            Object.keys(subs[name]).forEach( tag => {
                subs[name][tag](value[name])
            }
        )
    }
    core.update = (name) => {
        if (fatal.msg) return;
        stack.push(name);
        if (called[name]) { fail('circular dependency'); return; }
        deps[name] = {};
        called[name] = true;
        value[name] = fn[name]();
        if (name in watch) console.log(name,'=',value[name],get_vars(name).deps);
        Object.keys(deps).forEach( parent => {
            if (name in deps[parent]) trace_wrap('update',parent);
        });
        trace_wrap('run_subs',name);
        delete(called[name]);
        stack.pop();
    }
    let getter = (name, parent) => {
        if (fatal.msg) return;
        if (parent) deps[parent][name] = true;
        return value[name];
    }
    let setter = (name, val) => {
        if (fatal.msg) return;
        value[name] = val;
        if (name in watch) console.log(name,'=',value[name],get_vars(name).deps);
        trace_wrap('run_subs',name);
        Object.keys(deps).forEach( parent => {
            if (name in deps[parent]) trace_wrap('update',parent);
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
    let setup_dynamic = (obj, name, res) => {
        let _ = {};
        Object.keys(obj).forEach(
            child => Object.defineProperty(_, child, {
                get() { return getter(child, name); },
                set(v) { fail('function '+name+' is trying to change value '+child);  }
            }));
        fn[name] = () => {
            if (fatal.msg) return;
            let v; try { v = obj[name](_, (v) => setter(name, v) ); }
            catch(e) { show_vars(name); fail('exception'); console.log(e); }
            return v;
        }
        Object.defineProperty(res, name, {
            get() { return getter(name) }
        } )
    }
    let setup_static = (name, res) => {
        value[name] = obj[name];
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
        if (!obj['#fatal']) obj['#fatal'] = default_fatal;
        Object.keys(obj).forEach(name => {
            if (typeof obj[name] == 'function') setup_dynamic (obj, name, res);
            else setup_static (name, res);
            setup_sub(hash, name);
        });
    }
    const res = {
        _: { subs, fn, deps, value, fatal },
        '#': {},
        v: '1.28.57'
    };
    core.boot = (name) => trace_wrap('update',name);
    wrap(res, res['#'], obj);
    Object.keys(fn).forEach(name => { if (name[0] != '#') trace_wrap('boot',name) ; });
    return res;
}

module.exports = auto;