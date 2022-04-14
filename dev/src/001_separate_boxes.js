

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
    let publish = (n,v) => Object.keys(deps).forEach(m => { if (deps[m].indexOf(n)>-1) fn[m](v); });
    let clear_deps = (n) => delete(deps[n]);
    return {
        has, state, add_fn, subscribe, publish, clear_deps
    }
}

let fail = (msg,stack,fatal) => fatal.set({msg, stack: stack})

let get_stack = (fatal) => {
    let stack = [];
    return {
        push: (v) => stack.push(v),
        pop: () => stack.pop(),
        clear: () => stack = [],
        get: () => stack,
        check: (name) => {
            let ok = true;
            if (stack.indexOf(name)>-1) {
                ok = false;
                fail('circular dependency',stack,fatal)
            }
            stack.push(name);
            return ok;
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

let ctx = (name, fn, cache, pubsub, stack, fatal, set, ff) => new Proxy({}, {
    get(target, prop) {
        if (!cache.has(prop) && !pubsub.has(prop)) fail('function '+name+' is trying to access non-existent variable '+prop,stack.get(),fatal);
        else ff(name, fn, cache, pubsub, stack, fatal, set);
    },
    set(target, prop, value) {
        fail('function '+name+' is trying to change value '+prop,stack.get(),fatal);
    }
})

let ctx_follow = (name, fn, cache, pubsub, stack, fatal, set) => {
    
    if (!cache.has(prop) && prop in fn) execute(ctx_follow,prop,fn,cache,pubsub,stack,fatal,set);
    pubsub.subscribe(name, prop);
    return cache.get(prop);
}

let ctx_publish = (name, fn, cache, pubsub, stack, fatal, set) => {
    
    pubsub.subscribe(name, prop);
    return cache.get(prop);
}

let execute = (ctx, name, fn, stack, set) => {

    if (!stack.check(name)) return;

    set(fn[name](ctx,set));
}

let dynamic_access = (name,cache,stack,fatal) => 
({
    get() { return cache.get(name) },
    set(v) { fail('someone is trying to set function '+name,stack,fatal) }
})

let static_access = (name,cache,pubsub,stack) => 
({
    get() { return cache.get(name) }, 
    set(v) {
        stack.clear();
        cache.set(name, v); 
        pubsub.publish(name,v);  
    }
})

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
    
    let set_simple = name => v => cache.set(name, v);
    let set_publish = name => (v) => { cache.set(name, v); pubsub.publish(name,v); }

    let ctx_follow = (name, set) => ctx(name, fn, cache, pubsub, stack, fatal, set, );
    let ctx_publish = (name, set) => ctx(name, fn, cache, pubsub, stack, fatal, set);

    let exec_follow = set => name => execute(ctx_follow(name,set),name,fn,cache,pubsub,stack,fatal,set(name));
    let exec_publish = set => name => execute(ctx_publish(name,set),name,fn,cache,pubsub,stack,fatal,set(name));

    let statics = looper(obj, (n,v) => typeof v !== 'function');
    let dynamics = looper(obj, (n,v) => typeof v === 'function');

    statics.each( (n,v) => cache.set(n,v) );
    
    dynamics.each( (n,v) => fn[n] = v);
    dynamics.each( (n,v) => pubsub.add_fn(() => exec_follow(set_publish)(n), n) );
    
    // so far nothing has happened
    // now execute and publish
    // not sure which order this should be in?

    dynamics.each( (n,v) => { stack.clear(); exec_follow(set_publish)(n); } );

    // from here on no effect either

    if (!('#' in res)) res['#'] = {};

    statics.each( (n,v) => Object.defineProperty(res, n, static_access(n,cache,pubsub,stack)));
    dynamics.each( (n,v) => Object.defineProperty(res, n, dynamic_access(n,cache,stack,fatal)));

    loop_keys(obj, (n,v) => res['#'][n] = { subscribe: fn => {
        let f = () => fn(cache.get(n));
        f()
        pubsub.subscribe(f,n)
    }})

    res['_'] = { cache, pubsub, fatal }; // for debugging / testing

    return res;
}

let auto = (obj) => {
    
    let res = {}, 
        fn = {}, 
        fatal = get_fatal(),
        stack = get_stack(fatal),
        cache = mem_cache(),
        pubsub = simple_pubsub();
    
        return auto_(obj, res, fn, fatal, stack, cache, pubsub);
}

module.exports = { auto };