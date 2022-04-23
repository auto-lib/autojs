
let trace = (hook, objs) => {

    objs = objs || {};
    let { cache, error, pubsub } = objs;

    let tcache, terror, tpubsub;

    if (cache) tcache = name => {
        if (!name) return cache();
        let h = (fn,parm) => hook('cache',name,fn,parm);
        return ({
            get(n) { h('get',n); return cache(name).get(n); },
            set(v) { h('set',v); return cache(name).set(v); },
            has(v) { h('has',v); return cache(name).has(v); }
        })
    }
    
    return {
        cache: tcache || cache || require('./cache')(), 
        error: terror || error || require('./error')(), 
        pubsub: tpubsub || pubsub || require('./pubsub')()
    };
}

module.exports = trace;