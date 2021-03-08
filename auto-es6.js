
// 017_fatal_shutdown_and_back_to_no_stale.js

let auto = (obj) => {

    let running;     // what function is currently running
    let deps = {};   // list of dependencies for each function
    let fn = {};     // list of functions (runnable)
    let value = {};  // current actual values
    let stack = [];  // call stack
    let fatal = {};  // only set if fatal error occurs (and everything stops if this is set)
    
    const res = {                                      // return object
        _: { running, fn, deps, value, fatal },        // so we can see from the outside what's going on
        '#': {}                                        // subscribe methods for each member
    };

    let fail = (source, msg) => { 
        
        let _stack = []; stack.forEach(s => _stack.push(s));

        fatal.source = source;
        fatal.msg = msg;
        fatal.stack = _stack;
        
        if (fn['#fatal']) fn['#fatal'](res);
    }

    let update = (name) => {

        if (fatal.msg) return;

        deps[name] = [];
        running = name;
        if (stack.indexOf(name) !== -1)
        {
            stack.push(name);
            fail('run', 'circular dependency');
            stack.pop();
        }
        else
        {
            stack.push(name);
            let val = fn[name]();
            if (!fatal.msg) value[name] = val;
            stack.pop();
        }
        
        running = undefined;
    }

    let getter = (name) => {

        if (fatal.msg) return;

        if (running && deps[running].indexOf(name) === -1) deps[running].push(name);
        if (fn[name]) update(name);
        return value[name];
    }

    let delete_deps = (name) => {

        Object.keys(deps).forEach( key => {
    
            if (name == key)
            {
                delete(value[key]);
                delete_deps(name);
            }
        })
    }

    let setter = (name, val) => {

        if (fatal.msg) return;

        if (running) fail("can't have side affects inside a function")
        else {
            value[name] = val;
            delete_deps(name);
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

    Object.keys(fn).forEach(name => update(name));

    return res;
}

export default auto;