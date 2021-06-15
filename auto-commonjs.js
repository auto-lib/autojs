
// 026_asynchronous_functions.js

let debug = false; // set this to true to show all steps nicely indented
let spacer = '';
let trace =     !debug ? () => {} : (msg) => { if (msg) console.log(spacer+msg); } 
let trace_in =  !debug ? () => {} : (msg) => { if (msg) console.log(spacer+msg); spacer += '-'; }
let trace_out = !debug ? () => {} : (msg) => { if (msg) console.log(spacer+msg); spacer = spacer.slice(0,-1); }

let auto = (obj) => {

    let deps = {};   // list of dependencies for each function
    let fn = {};     // list of functions (runnable)
    let value = {};  // current actual values
    let stack = [];
    let called = {};  // which functions have been called (for loop detection)
    let fatal = {};  // only set if fatal error occurs (and everything stops if this is set)
    let subs = {};   // special functions (ones which don't connect to a value) to run each time a value changes

    let fail = (msg) => { 
        
        let _stack = []; stack.forEach(s => _stack.push(s));

        fatal.msg = msg;
        fatal.stack = _stack;
        
        if (fn['#fatal']) fn['#fatal'](res); // special function to react to fatal errors (so you can log to console / write to file / etc. on error)
    }

    let run_subs = (name) => {
        
        trace_in('run_subs(',name,') [',subs[name],']');

        if (subs[name]) Object.keys(subs[name]).forEach( tag => {
                trace('running sub',name,' ',tag,'with value',value[name]);
                subs[name][tag](value[name])
            }
        )

        trace_out();
    }

    // get an available name for subscription
    let get_subtag = (name) => {

        let val = 0;
        let tag = () => val.toString().padStart(3, "0"); // e.g. #012
        while( subs[name] && tag() in subs[name] ) val += 1; // increment until not found
        return tag();
    }
    
    let wrap = (res, hash, obj) => {

        // default fatal error handler
        if (!obj['#fatal']) obj['#fatal'] = (_) => { 
            console.log('FATAL',_._.fatal.msg);
            console.log(' stack',_._.fatal.stack);
            console.log(' _',_);
            console.log(' (there might be an error below too if your function failed as well)');
        }

        Object.keys(obj).forEach(name => {

            let prop;
        
            if (typeof obj[name] == 'function')
            {
                let _ = {};
                Object.keys(obj).forEach(child => Object.defineProperty(_, child, {
                    // this is the get/set _inside_ a function
                    get() { return getter(child, name); },
                    set(v) { fail('function '+name+' is trying to change value '+child); }
                }));

                fn[name] = () => obj[name](_, (v) => setter(name, v) );

                // this is getting the function itself (outside, kind-of)
                prop = { get() { return getter(name) } }
            }    
            else
            {
                value[name] = obj[name];
                prop = { get() { return getter(name) }, set(v) { setter(name, v) } }  // just set the return props i.e. getter + setter
            }

            Object.defineProperty(res, name, prop);

            hash[name] = {}
            hash[name].get = () => getter(name);
            hash[name].set = (v) => setter(name, v);
            hash[name].subscribe = (f) => {
        
                let subtag = get_subtag(name);
            
                if (!subs[name]) subs[name] = {}; // added this
                subs[name][subtag] = (v) => f(v); // now inside [name]
                
                if (name in fn && !(name in value)) update(name); // make sure it's up to date
                f(value[name]);
            
                // return unsubscribe method
                return () => { delete(subs[name][subtag]); } // now inside [name]
            };
        });
    }

    let update = (name) => {   // update a function

        trace_in('update('+name+')');

        if (fatal.msg) return; // do nothing if a fatal error has occurred

        stack.push(name);
        if (called[name]) fail('circular dependency');

        deps[name] = {};
        called[name] = true;
        value[name] = fn[name]();
        
        Object.keys(deps).forEach( parent => {
            if (name in deps[parent]) update(parent);
        });

        run_subs(name);

        delete(called[name]);
        stack.pop();

        trace_out('result from update '+name+': '+value[name]);
    }

    let getter = (name, parent) => {

        trace('GETTER '+name+' '+parent);

        if (fatal.msg) return; // do nothing if a fatal error occured

        if (parent) deps[parent][name] = true;

        trace('got '+value[name]);

        return value[name];
    }

    let setter = (name, val) => {

        trace_in('SETTER'+name+' '+val);

        if (fatal.msg) return; // do nothing if a fatal error occured

        value[name] = val; run_subs(name);

        Object.keys(deps).forEach( parent => {
            if (name in deps[parent]) update(parent);
        });

        trace_out();
    }

    const res = {                             // return object
        _: { subs, fn, deps, value, fatal },  // so we can see from the outside what's going on
        '#': {}                               // subscribe methods for each member
    };

    wrap(res, res['#'], obj);
    Object.keys(fn).forEach(name => { if (name[0] != '#') update(name) }); // boot process: update all functions, setting initial values and dependencies

    return res;
}


module.exports = auto;