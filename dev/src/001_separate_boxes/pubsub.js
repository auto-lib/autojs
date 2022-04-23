
// convert { x: { y: true, z: true } }
// to { x: ['y','z'] }
// for readability in debugging

let arr = (d) => {
    let o = {};
    Object.keys(d).forEach( key => o[key] = Object.keys(d[key]).map(name => name) );
    return o;
}

let make_pubsub = () => {

    let fns = {}, deps = {};
    
    let pubsub = (name) => {
        if (!name) return arr(deps); // how we view the state from the outside
        return ({
            fn: func => { fns[name] = func; func(); }, // define a function by name
            deps(d) { deps[name] = d; }, // set the dependencies for named function
            // call all functions that names this one
            trigger() { Object.keys(deps).forEach(n => { if (name in deps[n]) fns[n](); }) }
        })
    }

    return pubsub;
}

module.exports = make_pubsub;