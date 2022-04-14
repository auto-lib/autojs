
let make_cache = () => {

    let vals = {};

    let cache = (name) => {
        if (!name) return vals;
        return ({
            get(n) { return vals[n]; },
            set(v) { vals[name] = v; },
            has(n) { return n in vals; }
        })
    }

    return cache;
}

module.exports = make_cache;