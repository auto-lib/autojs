
// 017_fatal_shutdown_and_back_to_no_stale.js

let auto = (obj) => {

    let running;     // what function is currently running
    let deps = {};   // list of dependencies for each function
    let fn = {};     // list of functions (runnable)
    let value = {};  // current actual values
    let stack = [];  // call stack
    let fatal = {};  // only set if fatal error occurs (and everything stops if this is set)
    let subs = {};

    const res = {                                      // return object
        _: { subs, running, fn, deps, value, fatal },        // so we can see from the outside what's going on
        '#': {}                                        // subscribe methods for each member
    };

    let fail = (msg) => { 
        
        let _stack = []; stack.forEach(s => _stack.push(s));

        fatal.msg = msg;
        fatal.stack = _stack;
        
        if (fn['#fatal']) fn['#fatal'](res); // special function to react to fatal errors
    }

    let run_subs = (name) => {
        
        Object.keys(subs).forEach(tag => { 
            if (tag.length == name.length+4 && tag.substring(0,name.length+1) == '#'+name)
                subs[tag](value[name]); 
        });
    }

    let update = (name) => {

        if (fatal.msg) return; // do nothing if fatal error occurred

        deps[name] = [];
        running = name;
        stack.push(name);

        if (stack.indexOf(name) < stack.length-1) fail('circular dependency');
        else
        {
            let val = fn[name]();
            if (!fatal.msg && name[0]!='#')
            {
                if (val !== value[name])
                {
                    value[name] = val;
                    run_subs(name);
                }
            }  
        }
        
        stack.pop()
        running = undefined;
    }

    let getter = (name) => {

        if (fatal.msg) return; // do nothing if a fatal error occured

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

        if (fatal.msg) return; // do nothing if a fatal error occured

        if (running) fail("can't have side affects (setting "+name+") inside a function ("+running+")")
        else {
            if (value[name] !== val)
            {
                value[name] = val;
                delete_deps(name);
                run_subs(name);
            }
        }
    }

    // get an available name for subscription
    let get_subtag = (name) => {

        let val = 0;
        let tag = () => '#' + name + val.toString().padStart(3, "0"); // e.g. #msg012
        while( tag() in subs ) val += 1; // increment until not found
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
            subs[subtag] = (v) => f(v);
            f(value[name]);

            // return unsubscribe method
            return () => { delete(subs[subtag]); }
        };
    });

    Object.keys(fn).forEach(name => update(name)); // boot process: update all functions, setting initial values and dependencies

    return res;
}

/*
$ = auto({
    data: null
})

$['#'].data.subscribe( d => console.log(d));
$['#'].data.subscribe( d => console.log(d));
$['#'].data.subscribe( d => console.log(d));

$.data = [1,2,3];
$.data = [3,4,5];
*/

module.exports = auto;