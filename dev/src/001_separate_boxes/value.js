
let dynamic = (func,cache,pubsub) => {

    let f = func, c = cache, ps = pubsub;
    let deps = {}, errors = [];

    let ctx = new Proxy({},{
        get(t,n) { deps[n] = true;
            if (!c.has(n)) errors.push( n+' not found in cache' );
            else return c.get(n); },
        set(t,n,v) { errors.push({ msg: 'trying to set '+n }) }
    })

    let set = v => {
        c.set(v);
        ps.deps(deps);
        ps.trigger();
    }

    ps.fn( () => {
        deps = {};
        let v; try { v = f(ctx,set); }
        catch (e) { errors.push(e) }
        set(v);
    })

    return { deps, errors }
}

let static = (value,cache,pubsub) => {
    
}

// let log = [];
// let vals = {
//     x: 10
// }

// let cache = name => ({
//     get(n) { log.push('cache get '+n); return vals[n]; },
//     set(v) { log.push('cache set '+v); vals[name] = v; },
//     has(n) { log.push('cache has '+n); return n in vals; }
// })

// let pubsub = {
//     deps(deps) { log.push('pubsub deps ' + JSON.stringify(deps)); },
//     trigger() { log.push('pubsub trigger'); },
//     fn(f) { log.push('pubsub fn'); f(); }
// }

// let test1 = fn( _ => _.x * 10, cache('test1'), pubsub );

// console.log(log);
// console.log(test1);
// console.log(vals);

module.exports = { dynamic, static };