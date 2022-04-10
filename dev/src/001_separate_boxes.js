
let fail = (msg) => { console.log(msg); }

let get_stack = () => {
    let stack = [];
    return {
        push: (v) => stack.push(v),
        clear: () => stack = [],
        get: () => stack
    }
}

let ctx = (name, cache, pubsub) => new Proxy({}, {
    get(target, prop) {
        pubsub.subscribe(name, prop);
        return cache.get(prop);
    },
    set(target, prop, value) {
        fail('function '+name+' is trying to change value '+prop);
    }
})

let execute = (name, fn, cache, pubsub, stack, fatal) => {

    if (fatal.error) return;
    if (stack.get().indexOf(name)>-1) {
        stack.push(name);
        fatal.msg = 'circular dependency';
        fatal.stack = stack.get();
        return;
    }

    stack.push(name);

    let v = fn(ctx(name,cache,pubsub));

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
    let deps = {};
    let fn = {};
    return {
        state: () => deps,
        add_fn: (n,f) => fn[n] = f,
        subscribe: (n,m) => {
            if (!(n in deps)) deps[n] = [];
            if (deps[n].indexOf(m)==-1) deps[n].push(m);
        },
        publish: (n,v) => {
            Object.keys(deps).forEach(m => {
                if (deps[m].indexOf(n)>-1) fn[m](v);
            })
        },
        clear_deps: (n) => delete(deps[n])
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
            subscribe: f => () => {}
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
            if (!fatal.msg) stack.clear();
        }

        pubsub.add_fn(name,fn);

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