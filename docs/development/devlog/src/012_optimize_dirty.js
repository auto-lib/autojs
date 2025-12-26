
let auto = (obj) => {

    let running;
    let deps = {};
    let dirty = {};
    let fn = {};
    let value = {};

    let run = (name) => {

        deps[name] = [];
        running = name;
        let val = fn[name]();
        running = undefined;
        return val;
    }

    let getter = (name) => {

        if (running) deps[running].push(name);
        if (fn[name] && dirty[name])
        {
            value[name] = run(name);
            delete(dirty[name]);
        }
        return value[name];
    }

    let dirty_deps = (name) => {

        Object.keys(deps).forEach(n => {
    
            if (!dirty[n] && deps[n].indexOf(name) !== -1 )
            {
                dirty[n] = true;
                if (n[0]=='#') run(n);
                dirty_deps(n); // since it's dependency is dirty it must be too!
            }
        })
    }

    let setter = (name, val) => {

        if (running) console.trace("fatal: can't have side affects inside a function")
        else {
            value[name] = val;
            dirty_deps(name);
        }
    }

    const res = {
        _: { fn, deps, dirty, value },  // so we can see from the outside what's going on
        '#': {}                         // subscribe methods for each member
    };

    Object.keys(obj).forEach(name => {

        let _get = () => getter(name)
        let _set = (v) => setter(name, v)
    
        let prop;
    
        if (typeof obj[name] == 'function')
        {
            fn[name] = () => obj[name](res); // save function
            prop = { get: _get }             // what props to set on return object i.e. a getter
        }    
        else 
            prop = { get: _get, set: _set }  // just set the return props i.e. getter + setter
    
        Object.defineProperty(res, name, prop);
    
        // get an available name for subscription
        let get_sub_tag = (name) => {

            let val = 0;
            let tag = () => '#' + name + val.toString().padStart(3, "0"); // e.g. #msg012
            while( tag() in fn ) val += 1; // increment until not found
            return tag();
        }

        res['#'][name] = {}
        res['#'][name].subscribe = (f) => {
    
            let tag = get_sub_tag(name);
            fn[tag] = () => f(getter(name))
            run(tag)

            // return unsubscribe method
            return () => { delete(fn[tag]); delete(deps[tag]) }
        };
    });

    // run all the functions
    Object.keys(fn).forEach(name => {
        value[name] = run(name);
    })

    return res;
}

/*
let $ = auto({
    a: null,
    b: null,
    deps_on_a: ($) => $.a,
    deps_on_b: ($) => $.b,
    deps_on_a_and_b: ($) => { $.a; $.b; return null }
})
*/

let $ = auto({
    a: null,
    b: null,
    c: ($) => $.a,
    d: ($) => $.c,
    e: ($) => $.b
})

$.a = 'set';
console.log($._.dirty)
