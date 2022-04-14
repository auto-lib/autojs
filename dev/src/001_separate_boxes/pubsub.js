
// convert { x: { y: true, z: true } } to { x: ['y','z,'] }
// for readability in debugging
let arr = (d) => {
    let o = {};
    Object.keys(d).forEach( key => o[key] = Object.keys(d[key]).map(name => name) );
    return o;
}

let make_pubsub = () => {

    let fns = {}, deps = {};
    
    let pubsub = (name) => {
        if (!name) return arr(deps);
        return ({
            fn: func => { fns[name] = func; func(); },
            deps(d) { deps[name] = d; },
            trigger() { 
                Object.keys(deps).forEach(n => {
                    if (name in deps[n]) fns[n]()
                })
            }
        })
    }

    return pubsub;
}

module.exports = make_pubsub;