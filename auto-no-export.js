
// 019_run_affected_subs_in_setter.js

let auto = (obj) => {

    let running;     // what function is currently running
    let deps = {};   // list of dependencies for each function
    let fn = {};     // list of functions (runnable)
    let value = {};  // current actual values
    let stack = [];  // call stack
    let fatal = {};  // only set if fatal error occurs (and everything stops if this is set)
    let subs = {};   // special functions (ones which don't connect to a value) to run each time a value changes

    const res = {                             // return object
        _: { subs, fn, deps, value, fatal },  // so we can see from the outside what's going on
        '#': {}                               // subscribe methods for each member
    };

    let fail = (msg) => { 
        
        let _stack = []; stack.forEach(s => _stack.push(s));

        fatal.msg = msg;
        fatal.stack = _stack;
        
        if (fn['#fatal']) fn['#fatal'](res); // special function to react to fatal errors (so you can log to console / write to file / etc. on error)
    }

    let run_subs = (name) => {
        if (subs[name]) Object.keys(subs[name]).forEach( tag => subs[name][tag](value[name]) )
    }

    let update = (name) => {   // update a function

        if (fatal.msg) return; // do nothing if a fatal error has occurred
    
        deps[name] = [];       // reset dependencies for this function
        running = name;        // globally set that we are running
        stack.push(name);
    
        if (stack.length>1 && stack[0] == stack[stack.length-1]) fail('circular dependency');
        else if (name[0]!='#') // any function that starts with '#' is a function that doesn't save a corresponding value
        {
            let val = fn[name]();
            if (!fatal.msg) value[name] = val;
            else value[name] = undefined;
        }

        stack.pop()
        running = stack[stack.length-1];
    }

    let getter = (name) => {

        if (fatal.msg) return; // do nothing if a fatal error occured
        if (running && deps[running].indexOf(name) === -1) deps[running].push(name);

        if (!(name in value)) // value is stale
        {
            let val = value[name]; // save old value
            update(name);
            if (val != value[name]) run_subs(name); // value changed. run subscriptions
        }
    
        return value[name];
    }

    let delete_dep_values = (name) => {

        Object.keys(deps).forEach( key => {
    
            deps[key].forEach( sub => {

                if (name == sub)
                {
                    delete(value[key]);
                    delete_dep_values(key);
                }
            })
        })
    }

    let setter = (name, val) => {

        if (fatal.msg) return; // do nothing if a fatal error occured

        if (running) fail("function "+running+" is trying to change value "+name)
        else {
            if (value[name] !== val)
            {
                value[name] = val;
                delete_dep_values(name); // recursively delete values
                Object.keys(subs).forEach(sub => {
                    if (!(sub in value)) // a value that is subscribed to has changed
                    {
                        let keys = Object.keys(subs[sub]);
                        if (keys.length>0) // no need to run subs if there are no functions for it
                        {
                            //let val = value[sub]; // save old value
                            update(sub);
                            run_subs(sub); // value changed. run subscriptions
                        }
                    }
                })
            }
        }
    }

    // get an available name for subscription
    let get_subtag = (name) => {

        let val = 0;
        let tag = () => val.toString().padStart(3, "0"); // e.g. #012
        while( subs[name] && tag() in subs[name] ) val += 1; // increment until not found
        return tag();
    }

    // this whole section is run once
    Object.keys(obj).forEach(name => {

        let prop;
    
        if (typeof obj[name] == 'function')
        {
            fn[name] = () => obj[name](res); // save function
            prop = { get() { return getter(name) }}             // what props to set on return object i.e. a getter
        }    
        else
        {
            value[name] = obj[name];
            prop = { get() { return getter(name) }, set(v) { setter(name, v) } }  // just set the return props i.e. getter + setter
        }

        Object.defineProperty(res, name, prop);

        res['#'][name] = {}
        res['#'][name].get = () => getter(name);
        res['#'][name].set = (v) => setter(name, v);
        res['#'][name].subscribe = (f) => {
    
            let subtag = get_subtag(name);
        
            if (!subs[name]) subs[name] = {}; // added this
            subs[name][subtag] = (v) => f(v); // now inside [name]
            
            f(value[name]);
        
            // return unsubscribe method
            return () => { delete(subs[name][subtag]); } // now inside [name]
        };
    });

    Object.keys(fn).forEach(name => update(name)); // boot process: update all functions, setting initial values and dependencies

    return res;
}
