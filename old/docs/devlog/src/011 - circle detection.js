
let auto = (obj,c) => {

    c = c || {}
    c.trace == c.trace || false; // show execution order

    let running;
    let deps = {};
    let dirty = {};
    let fn = {};
    let value = {};
    let stack = [];

    let run = (name) => {

        if (c.trace) console.log("[" + name + "]")
        if (stack.indexOf(name) !== -1) console.trace("fatal: stack loop",stack,",",name);

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

    let setter = (name, val) => {

        if (running) console.trace("fatal: can't have side affects inside a function")
        else {
            value[name] = val;
            Object.keys(deps).forEach(n => {
                if (n[0]=='#') run(n);
                else dirty[n] = true
            })
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
    
        // create subscribe method
    
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
    tick: ($) => $.tock,
    tock: ($) => $.tick
}, {
    trace: true
})

console.log($._);
*/

/*
let $ = auto({
    data: null,
    count: ($) => $.data ? $.data.length : 0,
    msg: ($) => "got " + $.count + " items"
})

$.data = [1,2,3];
console.log("msg =",$.msg)
*/

let $ = auto({
    data: null
})

$['#'].data.subscribe( (v) => $.data = [1,2,3] )