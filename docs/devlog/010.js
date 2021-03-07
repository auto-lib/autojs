
let auto = (obj) => {

    let running;
    let deps = {};
    let dirty = {};
    let fs = {};
    let value = {};

    let update = (name) => {

        deps[name] = [];
        running = name;
        value[name] = fs[name]();
        running = undefined;
    }

    let getter = (name) => {

        if (running) deps[running].push(name);
        if (fs[name] && dirty[name])
        {
            update(name);
            delete(dirty[name]);
        }
        return value[name];
    }

    let setter = (name, val) => {

        if (running) console.trace("fatal: can't have side affects inside a function")
        else {
            value[name] = val;
            Object.keys(deps).forEach(n => {
                if (n[0]=='#') update(n);
                else dirty[n] = true
            })
        }
    }

    const res = {
        _: { deps, dirty, value }, // so we can see from the outside what's going on
        '#': {}
    };

    Object.keys(obj).forEach(name => {

        let _get = () => getter(name)
        let _set = (v) => setter(name, v)
    
        let prop;
    
        if (typeof obj[name] == 'function')
        {
            fs[name] = () => obj[name](res); // save function
            update(name);                    // calc value
            prop = { get: _get }             // what props to set on return object i.e. a getter
        }    
        else 
            prop = { get: _get, set: _set }  // just set the return props i.e. getter + setter
    
        Object.defineProperty(res, name, prop);
    
        // create subscribe method
    
        res['#'][name] = {}
        res['#'][name].subscribe = (fn) => {
    
            let i = 0;
            Object.keys(fn).forEach( f => { if( f.substring(0,name.length+1) == '#'+name ) i += 1} )
            let tag = "#" + name + i.toString().padStart(3, "0"); // e.g. #data012
    
            fs[tag] = () => fn(getter(name))
            update(tag)
        };
    });

    return res;
}

// check for invalid access message when using side affects inside a function
// i.e. trying to set a variable

/*
let $ = auto({
    data: null,
    update: ($) => { $.data = [1,2,3]; }
})
*/

let $ = auto({
    data: null,
    count: ($) => $.data ? $.data.length : 0,
    msg: ($) => $.data + " has " + $.count + " items",
})

$['#'].msg.subscribe( (v) => console.log("msg =",v) )

$.data = [1,2,3];

console.log($._)