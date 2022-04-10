
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

    let v = fn(_);
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

let makeres = (obj,cache,pubsub) => {
    let res = {};
    Object.keys(obj).forEach(name =>
        Object.defineProperty(res, name, { 
            get() { return cache.get(name) }, 
            set(v) { cache.set(name, v); pubsub.publish(name,v) } 
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
            if (typeof value === 'function')
            {
                pubsub.add_fn(name,() => execute(name,value,cache,pubsub));
                execute(name,value,cache,pubsub);
            }
            else
            {
                pubsub.add_fn(name,() => {}); 
                cache.set(name,value);
            }
        }
    })
    return makeres(obj,cache,pubsub);
}

let auto = (obj) => auto_(obj, mem_cache(), simple_pubsub());

module.exports = { auto };