
// function to intercept the inner calls of objects
// so we can see exactly what occurs internally
// e.g. let evts = [], hook = (obj,v,fn,parm) => evts.push({ obj,v,fn,parm });

// if you want to hook cache or error or pubsub, pass it in
// otherwise we return a default

module.exports = (func, objs) => {

    objs = objs || {};
    let { cache, error, pubsub } = objs;

    let tcache, terror, tpubsub;

    if (cache) tcache = name => {
        if (!name) return cache();
        let h = (fn,parm) => func('cache',name,fn,parm);
        return ({
            get(n) { h('get',n); return cache(name).get(n); },
            set(v) { h('set',v); return cache(name).set(v); },
            has(v) { h('has',v); return cache(name).has(v); }
        })
    }
    
    if (pubsub) tpubsub = (name) => {
        if (!name) return pubsub();
        let h = (fn,parm) => func('pubsub',name,fn,parm);
        return ({
            fn(func) { h('fn'); pubsub(name).fn(func); },
            deps(d) { h('deps',Object.keys(d)); pubsub(name).deps(d); },
            trigger() { h('trigger'); pubsub(name).trigger(); }
        })
    }

    return {
        cache: tcache || cache || require('./cache')(), 
        error: terror || error || require('./error')(), 
        pubsub: tpubsub || pubsub || require('./pubsub')()
    };
}
