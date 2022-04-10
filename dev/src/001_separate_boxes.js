
let fail = (msg,stack,fatal) => { 
    fatal.msg = msg;
    fatal.stack = stack.get(); }

let get_stack = () => {
    let stack = [];
    return {
        push: (v) => stack.push(v),
        clear: () => stack = [],
        get: () => stack
    }
}

let ctx = (name, cache, pubsub, stack, fatal) => new Proxy({}, {
    get(target, prop) {
        pubsub.subscribe(name, prop);
        return cache.get(prop);
    },
    set(target, prop, value) {
        fail('function '+name+' is trying to change value '+prop,stack,fatal);
    }
})

let execute = (name, fn, cache, pubsub, stack, fatal) => {

    if (fatal.error) return;
    if (stack.get().indexOf(name)>-1) {
        stack.push(name);
        fail('circular dependency',stack,fatal)
        return;
    }

    stack.push(name);

    let v = fn(ctx(name,cache,pubsub,stack,fatal));

    cache.set(name, v);
    pubsub.publish(name, v);
}

let mem_cache = () => {
    let value = {};
    return { 
        state: () => value, 
        set: (n,v) => value[n] = v, 
        get: n => value[n]
    }
}

let simple_pubsub = () => {
    let deps = {}, fn = {};
    let num = 0;
    let state = () => deps;
    let add_fn = (f,n) => {
        if (!n) { num += 1; n = '#'+num.toString().padStart(3, "0"); }
        fn[n] = f;
        return n;
    }
    let subscribe = (n,m) => {
        if (typeof n === 'function') n = add_fn(n);
        if (!(n in deps)) deps[n] = [];
        if (deps[n].indexOf(m)==-1) deps[n].push(m);
    }
    let publish = (n,v) => {
        Object.keys(deps).forEach(m => { if (deps[m].indexOf(n)>-1) fn[m](v); })
    }
    let clear_deps = (n) => delete(deps[n]);
    return {
        state, add_fn, subscribe, publish, clear_deps
    }
}

// connect to the outside world:
//  - get/set
//  - subscribe
//  - internals (for testing/debugging)

let makeres = (obj,cache,pubsub,fatal) => {
    let res = { '#': {} };
    Object.keys(obj).forEach(name => {
        Object.defineProperty(res, name, { 
            get() { return cache.get(name) }, 
            set(v) { cache.set(name, v); pubsub.publish(name,v) } 
        })
        res['#'][name] = {
            subscribe: f => {
                pubsub.subscribe(f,name);
                f(cache.get(name));
            }
        }
    })
    res['_'] = { cache, pubsub, fatal };
    return res;
}

let box = (name,value,cache,pubsub,stack,fatal) =>
{
    if (typeof value === 'function')
    {
        // register a function under the variable name
        // which can be subscribed to

        let fn = () => {
            execute(name,value,cache,pubsub,stack,fatal);
            stack.clear();
        }

        pubsub.add_fn(fn,name);

        fn();
    }
    else
        cache.set(name,value);
}

let auto_ = (obj,cache,pubsub) => {
    
    let stack = get_stack(); // call stack (circle detection)
    let fatal = {}; // fatal error

    Object.keys(obj).forEach(name => { if (name[0] != '#') box(name,obj[name],cache,pubsub,stack,fatal) });

    return makeres(obj,cache,pubsub,fatal);
}

let auto = (obj) => auto_(obj, mem_cache(), simple_pubsub());

module.exports = { auto };