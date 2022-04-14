
let make_cache = () => {

    let vals = {};

    let cache = (name) => {
        if (!name) return vals;
        return ({
            get(n) { console.log('cache get '+n); return vals[n]; },
            set(v) { console.log('cache set '+name+' to '+v); vals[name] = v; },
            has(n) { console.log('cache has '+n); return n in vals; }
        })
    }
    
    return cache;
}

module.exports = make_cache;