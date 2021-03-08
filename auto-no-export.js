
// 015_no_stale_structure.js

let auto = (obj) => {

    let running;
    let deps = {};
    let fn = {};
    let value = {};

    const res = {                                   // return object
        _: { running, fn, deps, value },            // so we can see from the outside what's going on
        '#': {}                                     // subscribe methods for each member
    };

    let fail = (msg) => { res._.fatal = msg; if (fn['#fatal']) fn['#fatal'](res); }

    let run = (name) => {

        deps[name] = [];
        running = name;
        let val = fn[name]();
        running = undefined;
        return val;
    }

    let getter = (name) => {

        if (running && deps[running].indexOf(name) == -1) deps[running].push(name);
        if (fn[name] && !value[name]) value[name] = run(name);

        return value[name];
    }

    let set_stale = (name, stack) => {

        stack = stack || [];

        Object.keys(deps).forEach(n => {
    
            if (deps[n].indexOf(name) !== -1)
            {
                // ok, we have found 'name' as a dependent of something i.e. of 'n'
                // (wish this could be simpler...)
    
                if (fn[n]) // so n is a function which depends on n
                {
                    if (stack.indexOf(n) !== -1)
                    {
                        let msg = n; while (stack.length>0) msg += ' -> ' + stack.pop(); // a -> b -> c
                        fail("circular dependency "+msg);
                        return;
                    }

                    stack.push(n);
    
                    if (value[n] && deps[n].indexOf(name) !== -1 )
                    {
                        delete(value[n]);
                        if (n[0]=='#') run(n);
                        set_stale(n,stack); // since it's dependency is dirty it must be too!
                    }
        
                    stack.pop();
                }
            }
        })
    }

    let setter = (name, val) => {

        if (running) fail("can't have side affects inside a function")
        else {
            value[name] = val;
            set_stale(name);
        }
    }

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
        {
            value[name] = obj[name];
            prop = { get: _get, set: _set }  // just set the return props i.e. getter + setter
        }

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
        if (name[0]!='#') value[name] = run(name);
    })

    return res;
}