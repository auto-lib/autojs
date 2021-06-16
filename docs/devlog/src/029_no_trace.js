
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

    // if you pass in something like { one: true, two: true }
    // then any time anything happens with either 'one' or 'two'
    // (static or dynamic variables) you will get a log message.

    let watch = opt && opt.watch ? opt.watch : {};

    // used when a function (of a dynamic variable) causes an exception / has an error
    // we print out all the values of the dependent variables of the function
    // as well as the dependents of those variables, recursively, so you can
    // see the entire state tree that led to all the values

    let get_vars = (name) => {
        let o = { deps: {}, value: value[name] };
        if (name in deps) Object.keys(deps[name]).forEach(dep => {
            if (!deps[dep]) o.deps[dep] = value[dep];
            else {
                o.deps[dep] = { value: value[dep], deps: {} };
                Object.keys(deps[dep]).forEach(inner => o.deps[dep].deps[inner] = get_vars(inner));
            }
        })
        return o;
    }
    let show_vars = (name) => console.log('exception in '+name,get_vars(name).deps);

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
        
        if (subs[name]) // not all values have subscriptions
            Object.keys(subs[name]).forEach( tag => subs[name][tag](value[name]) // run the function given to us
        )
    }
    
    // == update a dynamic value ==
    // == never static ==

    let update = (name) => {   

        if (fatal.msg) return;

        stack.push(name); // save call stack (for debug messages)
        if (called[name]) { fail('circular dependency'); return; } // this value has been updated higher up the chain i.e. by a parent, so we are in a circle

        deps[name] = {}; // clear dependencies for this value
        called[name] = true; // to make sure we're not in a circular dependency
        value[name] = fn[name](); // run the dynamic value's function and save the output

        if (name in watch) console.log(name,'=',value[name],get_vars(name).deps);

        // make sure any dynamic values dependent on this one are updated too
        Object.keys(deps).forEach( parent => {
            if (name in deps[parent]) update(parent);
        });

        // run any subscriptions to this value
        run_subs(name);

        // clear from called and call stack
        delete(called[name]);
        stack.pop();
    }

    // == get a value ==
    // == can be for static or dynamic values ==

    let getter = (name, parent) => {

        if (fatal.msg) return;

        if (parent) deps[parent][name] = true;

        return value[name];
    }

    // == set a static value ==
    // == should never be a dynamic value ==

    let setter = (name, val) => {

        if (fatal.msg) return;

        value[name] = val; // save
        if (name in watch) console.log(name,'=',value[name],get_vars(name).deps);

        run_subs(name);    // run subscriptions to this value

        // make sure any dynamic values dependent on this one
        // are updated
        Object.keys(deps).forEach( parent => {
            if (name in deps[parent]) update(parent);
        });
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
            subs[name][subtag] = (v) => f(v);
            
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

            // run the function and catch any error,
            // printing out all the dependent variables if
            // it does

            let v; try { v = obj[name](_, (v) => setter(name, v) ); }
            catch(e) { show_vars(name); fail('exception'); console.log(e); }
            
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
    Object.keys(fn).forEach(name => { if (name[0] != '#') update(name); }); // TODO need to look into this hash thing...

    return res;
}