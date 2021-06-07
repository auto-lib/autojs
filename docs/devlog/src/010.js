
let auto = (obj) => {

    let running;
    let deps = {};
    let dirty = {};
    let fn = {};
    let value = {};

    let update = (name) => {

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
            value[name] = update(name);
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
            value[name] = update(name);                    // calc value
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
            update(tag)

            // return unsubscribe method
            return () => { delete(fn[tag]); delete(deps[tag]) }
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

// check possible hack that shouldn't be allowed

/*
let $ = auto({
    msg: null,
    thingy: ($) => console.log($['#msg001'])
})

$['#'].msg.subscribe( (v) => console.log("msg =",v) )

console.log($._)
*/

// check unsubscribe
// removes everything from internals

/*
let $ = auto({
    data: null,
    count: ($) => $.data ? $.data.length : 0,
    msg: ($) => $.data + " has " + $.count + " items",
})

let unsub = $['#'].msg.subscribe( (v) => console.log("msg =",v) )

$.data = [1,2,3];

console.log($._)

console.log("running unsub");

unsub();

console.log($._);
*/

// check the function names for subscribes
// uses gaps properly

let $ = auto({ msg: null })

let unsub_one = $['#'].msg.subscribe( () => {} )
let unsub_two = $['#'].msg.subscribe( () => {} )
let unsub_thr = $['#'].msg.subscribe( () => {} )

console.log($._)

unsub_two();
let another_unsub = $['#'].msg.subscribe( () => {} )
console.log($._)