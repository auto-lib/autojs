
let fail = (msg,stack,fatal) => fatal.set({msg, stack: stack})

let get_stack = (fatal) => {
    let stack = [];
    return {
        push: (v) => stack.push(v),
        pop: () => stack.pop(),
        clear: () => stack = [],
        get: () => stack,
        check: (name) => {
            if (fatal.get().msg) return false;
            if (stack.indexOf(name)>-1) {
                stack.push(name);
                fail('circular dependency',stack,fatal)
                return false;
            }
            return true;
        }
    }
}

let get_fatal = () => {
    let fatal = {};
    return {
        set: (v) => fatal = v,
        get: () => fatal
    }
}

let ctx_follow = (name, fn, cache, pubsub, stack, fatal) => new Proxy({}, {
    get(target, prop) {
        if (!cache.has(prop) && !pubsub.has(prop)) fail('function '+name+' is trying to access non-existent variable '+prop,stack.get(),fatal);
        else {
            if (!cache.has(prop) && prop in fn) execute_follow(prop,fn,cache,pubsub,stack,fatal);
            pubsub.subscribe(name, prop);
            return cache.get(prop);
        }
    },
    set(target, prop, value) {
        fail('function '+name+' is trying to change value '+prop,stack.get(),fatal);
    }
})

let ctx_publish = (name, fn, cache, pubsub, stack, fatal) => new Proxy({}, {
    get(target, prop) {
        if (!cache.has(prop) && !pubsub.has(prop)) fail('function '+name+' is trying to access non-existent variable '+prop,stack.get(),fatal);
        else {
            pubsub.subscribe(name, prop);
            return cache.get(prop);
        }
    },
    set(target, prop, value) {
        fail('function '+name+' is trying to change value '+prop,stack.get(),fatal);
    }
})

let execute_follow = (name, fn, cache, pubsub, stack, fatal) => {

    stack.check(name);
    if (fatal.get().msg) return;
    stack.push(name);

    let set = (v) => cache.set(name, v);

    let v = fn[name](ctx_follow(name, fn, cache, pubsub, stack, fatal),set);

    set(v);

}

let execute_publish = (name, fn, cache, pubsub, stack, fatal) => {

    stack.check(name);
    if (fatal.get().msg) return;
    stack.push(name);

    let set = (v) => {
        cache.set(name, v);
        pubsub.publish(name, v);
    }

    let v = fn[name](ctx_publish(name,fn,cache,pubsub,stack,fatal),set);

    set(v);
}

let mem_cache = () => {
    let value = {};
    return { 
        state: () => value, 
        set: (n,v) => value[n] = v,
        get: n => value[n],
        has: n => n in value
    }
}

let simple_pubsub = () => {
    let deps = {}, fn = {};
    let num = 0;
    let has = n => n in fn;
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
        has, state, add_fn, subscribe, publish, clear_deps
    }
}

let dynamic_access = (res,name,cache,stack,fatal) => {
    Object.defineProperty(res, name, { 
        get() { return cache.get(name) }, 
        set(v) { fail('someone is trying to set function '+name,stack,fatal); }
    })
}

let static_access = (res,name,cache,pubsub,stack) => {
    Object.defineProperty(res, name, { 
        get() { return cache.get(name) }, 
        set(v) {
            stack.clear();
            cache.set(name, v); 
            pubsub.publish(name);  
        }
    })
}

let loop_keys = (obj, fn) => Object.keys(obj).forEach(name => fn(name,obj[name]));

let key_map = (obj, fn) => {
    let o = {};
    loop_keys(obj, (name, value) => { if (fn(name,value)) o[name] = value })
    return o;
}
let looper = (obj,fn) => {
    let o = key_map(obj, (name,value) => fn(name,value));
    return { each: fn => loop_keys(o,fn) }
}

let auto_ = (obj,res,fn,fatal,stack,cache,pubsub) => {
    
    let exec_follow = (name) => execute_follow(name,fn,cache,pubsub,stack,fatal);
    let exec_publish = (name) => execute_publish(name,fn,cache,pubsub,stack,fatal);

    let statics = looper(obj, (n,v) => typeof v !== 'function');
    let dynamics = looper(obj, (n,v) => typeof v === 'function');

    statics.each( (n,v) => cache.set(n,v) );
    
    dynamics.each( (n,v) => fn[n] = v);
    dynamics.each( (n,v) => pubsub.add_fn(() => exec_publish(n), n) );
    
    // so far nothing has happened
    // now execute and publish
    // not sure which order this should be in?

    //statics.each( (n,v) => { stack.clear(); pubsub.publish(n); });
    dynamics.each( (n,v) => { stack.clear(); exec_follow(n); } );
    //dynamics.each( (n,v) => { stack.clear(); pubsub.publish(n); });

    // from here on no effect either

    if (!('#' in res)) res['#'] = {};

    statics.each( (n,v) => static_access(res,n,cache,pubsub,stack) );
    dynamics.each( (n,v) => dynamic_access(res,n,cache,stack,fatal) );

    loop_keys(obj, (n,v) => res['#'][n] = { subscribe: fn => {
        let f = () => fn(cache.get(n));
        f()
        pubsub.subscribe(f,n)
    }})

    res['_'] = { cache, pubsub, fatal }; // for debugging / testing

    return res;
}

let auto = (obj) => {
    let fatal = get_fatal();
    return auto_(obj, {}, {}, fatal, get_stack(fatal), mem_cache(), simple_pubsub())
}

module.exports = { auto };