
let make_pubsub = () => {

    let fns = {}, deps = {};

    let pubsub = (name) => {
        if (!name) return deps;
        return ({
            fn: func => { console.log('pubsub fn '+name); fns[name] = func; func(); },
            deps(deps) { console.log('pubsub deps ' + name + ' ' + JSON.stringify(deps)); deps[name] = deps; },
            trigger() { 
                console.log('pubsub trigger '+name); 
                Object.keys(deps).forEach(n => {
                    if (name in deps[n]) fns[n]()
                })
            }
        })
    }

    return pubsub;
}

module.exports = make_pubsub;