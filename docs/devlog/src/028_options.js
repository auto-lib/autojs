
// this is just for my own debugging when i want to see
// exactly what is happening in the tests.
// still want to make this cleaner ... all these extra lines in the code ...

let debug = false; // set this to true to show all steps nicely indented
let spacer = '';
let logger = (args) => { if (args.length>0) { if(spacer.length>0) args.unshift(spacer); console.log.apply(console,args); }}
let trace_flat = !debug ? () => {} : (...args) => { logger(args); } 
let trace_in =   !debug ? () => {} : (...args) => { logger(args); spacer += '-'; }
let trace_out =  !debug ? () => {} : (...args) => { logger(args); spacer = spacer.slice(0,-1); }

// the biggest thing to understand is the distinction between static and
// dynamic values. static values can only be changed from the outside
// where-as dynamic values can only change from the inside, basically

let auto = (obj,opt) => {

    let deps = {};   // list of dependencies (dynamic)
    let fn = {};     // list of functions (dynamic)
    let value = {};  // current values (static and dynamic)
    let stack = [];  // list of call stack
    let called = {};  // which functions have been called (for loop detection)
    let fatal = {};  // only set if fatal error occurs (and everything stops if this is set)
    let subs = {};   // functions to run each time a value changes (static and dynamic)
    let trace = opt && opt.trace ? opt.trace : {};

    let show_vars = (name) => {
        let o = {};
        Object.keys(deps[name]).forEach(dep => {
            o[dep] = value[dep];
        })
        console.log('exception in '+name+'. deps:',o);
    }

    // ------------------------------------------------------
    // the following five functions are what run continuously
    // (and everything after the break is just setup code)
    // ------------------------------------------------------
    
    // == something went wrong ==
    // == save the message/stack and run any subscriptions to this (TODO on subscriptions) ==

    let fail = (msg) => { 
        
        let _stack = []; stack.forEach(s => _stack.push(s)); // copy out the call stack

        // save out to global object
        // so we can access it from outside for debugging
        // and also update uses this to stop looping during a circle

        fatal.msg = msg;
        fatal.stack = _stack;
        
        //if (fn['#fatal']) fn['#fatal'](res); // run the function #fatal which is meant for reactions to errors. this should be a subscription so we can have multiple...
    }

    // == run any subscriptions to a value ==
    // == static or dynamic ==

    let run_subs = (name) => {
        
        if (name in trace) trace_in('run_subs('+name+') ['+subs[name]+']');

        if (subs[name]) // not all values have subscriptions
            Object.keys(subs[name]).forEach( tag => {
                if (name in trace) trace_flat('running sub',name,tag,'with value',value[name]);
                subs[name][tag](value[name]) // run the function given to us
            }
        )

        if (name in trace) trace_out();
    }
    
    // == update a dynamic value ==
    // == never static ==

    let update = (name) => {   

        if (fatal.msg) return;

        if (name in trace) trace_in('update('+name+')');

        stack.push(name); // save call stack (for debug messages)
        if (called[name]) { fail('circular dependency'); return; } // this value has been updated higher up the chain i.e. by a parent, so we are in a circle

        deps[name] = {}; // clear dependencies for this value
        called[name] = true; // to make sure we're not in a circular dependency
        value[name] = fn[name](); // run the dynamic value's function and save the output
        
        //if (name in trace) trace_flat('return from function:',value[name]);

        // make sure any dynamic values dependent on this one are updated too
        Object.keys(deps).forEach( parent => {
            if (name in deps[parent]) update(parent);
        });

        // run any subscriptions to this value
        run_subs(name);

        // clear from called and call stack
        delete(called[name]);
        stack.pop();

        if (name in trace) trace_out('result from update '+name+':',value[name]);
    }

    // == get a value ==
    // == can be for static or dynamic values ==

    let getter = (name, parent) => {

        if (fatal.msg) return;

        if (name in trace || parent in trace) trace_flat('getter ('+name+','+parent+') is',value[name]);

        if (parent) deps[parent][name] = true;

        return value[name];
    }

    // == set a static value ==
    // == should never be a dynamic value ==

    let setter = (name, val) => {

        if (fatal.msg) return;

        if (name in trace) trace_in('setter('+name+',',val,')');

        value[name] = val; // save
        run_subs(name);    // run subscriptions to this value

        // make sure any dynamic values dependent on this one
        // are updated
        Object.keys(deps).forEach( parent => {
            if (name in deps[parent]) update(parent);
        });

        if (name in trace) trace_out();
    }

    // --------------------------------------------
    // everything from here down is just setup code
    // --------------------------------------------

    // get an available name for subscription
    // tricky because they can disappear when unsubscribed from

    let get_subtag = (name) => {

        let val = 0;
        let tag = () => val.toString().padStart(3, "0"); // e.g. #012
        while( subs[name] && tag() in subs[name] ) val += 1; // increment until not found
        return tag();
    }
    
    // setup the subscribe function
    // and add get/set (mostly for svelte integration)

    let setup_sub = (hash, name) => {

        // we access this with something like _['#'].data.subscribe( (v) => console.log('data:',v); )
        hash[name] = {}
        hash[name].get = () => getter(name);
        hash[name].set = (v) => setter(name, v);
        hash[name].subscribe = (f) => {
            
            // run the function immediately on latest value
            f(value[name]);
        
            // you can subscribe multiple times
            // so we need to get a unique code for each one
            let subtag = get_subtag(name);
        
            // save sub function
            if (!subs[name]) subs[name] = {};
            subs[name][subtag] = (v) => {
                if (name in trace) trace_in('running sub for '+name+' tag '+tag);
                f(v);
                if (name in trace) trace_out();
            }
            // return unsubscribe method
            return () => { delete(subs[name][subtag]); }
        };
    }

    // setup a dynamic value
    // called from wrap() below

    let setup_dynamic = (obj, name, res) => {

        let _ = {};

        // this is kind of magic
        // each function gets it's own special global object
        // which called getter with it's own name as the parent parameter

        Object.keys(obj).forEach(
            child => Object.defineProperty(_, child, {

                // this is the get/set _inside_ a function
                get() { return getter(child, name); },
                set(v) { fail('function '+name+' is trying to change value '+child);  }

            }));

        // here we pass in the specially modified global object to the function
        // and also throw in the set parameter for async functions

        fn[name] = () => {
            if (fatal.msg) return;
            if (name in trace) trace_in('fn['+name+']');
            let v;
            try {
                v = obj[name](_, (v) => setter(name, v) );
            }
            catch(e) { show_vars(name); fail('exception'); console.trace(e); }
            if (name in trace) trace_out();
            return v;
        }
        // this is getting the function itself (outside, kind-of)
        Object.defineProperty(res, name, { 
            get() { return getter(name) } 
        } )
    }

    // setup a static value
    // called from wrap() below

    let setup_static = (name, res) => {

        // save whatever was defined originally
        value[name] = obj[name];

        // use our functions for get/set
        Object.defineProperty(res, name, { 
            get() { return getter(name) }, 
            set(v) { setter(name, v) } 
        })
    }

    // nothing happens when a fatal error occurs really so the
    // tests are cleaner but also it's pluggable so you can
    // respond however you want. this is set by default for the browser

    let default_fatal = (_) => {

        console.log('FATAL',_._.fatal.msg);
        console.log(' stack',_._.fatal.stack);
        console.log(' _',_);
        console.log(' (there might be an error below too if your function failed as well)');
    }
    
    // called once on the root object
    
    let wrap = (res, hash, obj) => {

        // add handler that prints out to console for convenience in browser
        if (!obj['#fatal']) obj['#fatal'] = default_fatal;

        // loop through each key
        Object.keys(obj).forEach(name => {

            // setup dynamic/static
            if (typeof obj[name] == 'function') setup_dynamic (obj, name, res);
            else setup_static (name, res);

            // create subscribable object
            setup_sub(hash, name);
        });
    }

    // the object we will access from the outside
    // gives access to the internals via _
    // and subscribable versions of each value via '#'

    const res = {                             // return object
        _: { subs, fn, deps, value, fatal },  // so we can see from the outside what's going on
        '#': {},                               // subscribe methods for each member
        v: undefined                            // version number of this lib
    };

    // do everything
    // run wrap, and run update on all dynamic values

    wrap(res, res['#'], obj);
    Object.keys(fn).forEach(name => { 
        if (name[0] != '#') {
            if (name in trace) trace_in('boot of ['+name+']')
            update(name) ;
            if (name in trace) trace_out();
        }
    }); // TODO need to look into this hash thing...

    return res;
}