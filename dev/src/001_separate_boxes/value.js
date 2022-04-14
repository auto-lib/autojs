
let dynamic = (func,cache,pubsub,error) => {

    let f = func, c = cache, ps = pubsub, e = error;
    let deps = {};

    let ctx = new Proxy({},{
        get(t,n) { 
            deps[n] = true;
            if (!c.has(n)) e(n+' not found in cache');
            else return c.get(n); },
        set(t,n,v) { 
            e('trying to set '+n) }
    })

    let set = v => {
        c.set(v);
        ps.deps(deps);
        ps.trigger();
    }

    ps.fn( () => {
        deps = {};
        let v; try { v = f(ctx,set); }
        catch (err) { e(err) }
        set(v);
    })
}

let static = (value,cache) => cache.set(value);

module.exports = { dynamic, static };