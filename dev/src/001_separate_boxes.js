
let execute = (name, fn, cache, pubsub) => {

    let _ = new Proxy({}, {
        get(target, prop) {
            pubsub.subscribe(name, prop);
            return cache.get(prop);
        },
        set(target, prop, value) {
            fail('function '+name+' is trying to change value '+prop);
        }
    })

    cache.set(name, fn(_));
}

let mem_cache = () => {
    let value = {};
    return { state: () => value, set: (n,v) => value[n] = v, get: n => value[n] }
}

let simple_pubsub = () => {
    let deps = {};
    return {
        state: () => deps,
        subscribe: (n,f) => {
            if (!(n in deps)) deps[n] = [];
            deps[n].push(f);
        },
        publish: (n,v) => {
            if (n in deps) deps[n].forEach(f => f(v))
        },
        clear_deps: (n) => delete(deps[n])
    }
}

let auto_ = (obj,cache,pubsub) => {
    
    Object.keys(obj).forEach(name => {
        if (name[0] != '#')
        {
            let value = obj[name];
            if (typeof value === 'function') execute(name,value,cache,pubsub);
            else cache.set(name,value);
        }
    })
    return { cache, pubsub }
}

let auto = (obj) => auto_(obj, mem_cache(), simple_pubsub());

module.exports = { auto };