
let fail = (msg) => { console.log(msg); }

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
        subscribe: (n,f,m) => {
            if (!(n in deps)) deps[n] = [];
            // named function
            if (m) {
                let o = {};
                o[m] = f;
                deps[n].push(f);
            }
            else
                deps[n].push(f);
        },
        publish: (n,v) => {
            if (n in deps) deps[n].forEach(f => f(v))
        },
        clear_deps: (n) => delete(deps[n])
    }
}

let makeres = (obj,cache,pubsub) => {
    let res = {};
    Object.keys(obj).forEach(name =>
        Object.defineProperty(res, name, { 
            get() { return cache.get(name) }, 
            set(v) { pubsub.publish(name,v) } 
        })
    )
    res['#'] = { cache, pubsub };
    return res;
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
    return makeres(obj,cache,pubsub);
}

let auto = (obj) => auto_(obj, mem_cache(), simple_pubsub());

module.exports = { auto };