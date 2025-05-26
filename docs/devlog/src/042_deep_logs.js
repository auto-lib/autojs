
// the biggest thing to understand is the distinction between static and
// dynamic values. static values can only be changed from the outside
// where-as dynamic values can only change from the inside, basically

/**
 * @template T
 * @param {T} obj
 * @param {import('../../../types/index.js').AutoOptions} [opt]
 * @returns {import('../../../types/index.js').Auto<T>}
 * @example
 * let auto = require('auto');
 * let obj = {
 *    data: null,
 *   count: ($) => $.data ? $.data : undefined
 * }
 * let _ = auto(obj);
 * _.data; // null
 * _.count; // undefined
 * res.data = [1,2,3];
 * res.count; // 3
*/
let auto = (obj,opt) => {

    let deps = {};   // list of dependencies (dynamic)
    let fn = {};     // list of functions (dynamic)
    let value = {};  // current values (static and dynamic)
    let stack = [];  // list of call stack
    let fatal = {};  // only set if fatal error occurs (and everything stops if this is set)
    let subs = {};   // functions to run each time a value changes (static and dynamic)
    let trace = {};  // trace of each change: from set to finish, should be tree of changes, with variable values
    let tnode = {};
    let trace_fn = opt && opt.trace; // function to run on each trace
    let count = opt && opt.count; // function to run on each trace
    let counts = {};
    let tag = opt && opt.tag; // string to show in log messages
    let deep_log = opt && opt.deep_log; // if true, log everything to the console (for catestrophic failures)

    if (deep_log) console.log(`${tag?'['+tag+'] ':''}auto started`,obj);

    let static_external = [];
    let static_internal = [];
    let static_mixed = [];

    let dynamic_external = [];
    let dynamic_internal = [];
    let dynamic_mixed = [];

    // if you pass in something like { one: true, two: true }
    // then any time anything happens with either 'one' or 'two'
    // (static or dynamic variables) you will get a log message.

    let watch = opt && 'watch' in opt ? opt.watch : {};
    let report_lag = opt && 'report_lag' in opt ? opt.report_lag : 100; // log a message any time a function takes longer than report_lag milliseconds (default 100)
    let tests = opt && 'tests' in opt ? opt.tests : {}; // before boot run a test

    // used when a function (of a dynamic variable) causes an exception / has an error
    // we print out all the values of the dependent variables of the function
    // as well as the dependents of those variables, recursively, so you can
    // see the entire state tree that led to all the values

    let get_vars = (name,array_only) => {
        let o = { deps: {}, value: value[name] };
        if (name in deps)
            Object.keys(deps[name]).forEach(dep => {
                if (!deps[dep])
                {
                    if (array_only && Array.isArray(value[dep]))
                        o.deps[dep] = `array, length ${value[dep].length}`;
                    else
                        o.deps[dep] = value[dep];
                }
                else {
                    o.deps[dep] = { value: value[dep], deps: {} };
                    Object.keys(deps[dep]).forEach(inner => o.deps[dep].deps[inner] = get_vars(inner)); }
            })
        return o;
    }
    let show_vars = (name) => console.log(`${tag?'['+tag+'] ':''}EXCEPTION in ${name}`,get_vars(name).deps);

    // ------------------------------------------------------
    // the following five functions are what run continuously
    // (and everything after the break is just setup code)
    // ------------------------------------------------------

    // == something went wrong ==
    // == save the message/stack and run any subscriptions to this (TODO on subscriptions) ==

    let fail = (msg,stop) => {

        // save out to global object
        // so we can access it from outside for debugging
        // and also update uses this to stop looping during a circle

        fatal.msg = msg;
        fatal.stack = stack.map(s => s); // copy out the call stack
        let vars = get_vars(stack[stack.length-1],true);

        // this is quite dangerous. if the fatal function is set,
        // and _it_ fails, then we will never see any errors ...
        if (typeof fn['#fatal'] === 'function') fn['#fatal']({msg,res,stack:stack,vars}); // run the function #fatal which is meant for reactions to errors. this should be a subscription so we can have multiple...
    }

    // == run any subscriptions to a value ==
    // == static or dynamic ==

    let run_subs = (name) => {
        if (subs[name]) // not all values have subscriptions
        {
            if (name in watch) console.log(`${tag?'['+tag+'] ':''}[run subs]`,name);
            Object.keys(subs[name]).forEach( tag => subs[name][tag](value[name]))
        }
    }

    // == update a dynamic value ==
    // == never static ==

    let update = (name,src,caller) => {

        if (deep_log&&(src||caller)) console.log(`${tag?'['+tag+'] ':''}updating ${name}`,src?'because '+src:'',caller?'called by '+caller:'');

        if (value[name]) return;

        if (name in watch && caller)
        {
            console.log(`${tag?'['+tag+'] ':''}updating ${name}`,'because',caller,'called it');
        }

        if (name in watch && src)
        {
            console.log(`${tag?'['+tag+'] ':''}updating ${name}`,'because',src,'changed');
        }

        if (count) counts[name]['update'] += 1;

        // Object.keys(deps).forEach( child => {
        //     if (name in deps[child] && !(child in value)) update(child);
        // })

        if (fatal.msg) return;

        stack.push(name); // save call stack (for debug messages and circle detection)
        if (stack.indexOf(name)!==stack.length-1) { fail('circular dependency'); return; }

        deps[name] = {}; // clear dependencies for this value
        let t0 = performance.now();

        let v = fn[name](); // run the dynamic value's function and save the output

        if ( !value[name] && !v)
        {
            // console.log('skipping',name,'because both old and new value are null');
        }
        {
            if (!!v && typeof v.then === 'function')
            {
              value[name] = v;//'async awaiting'; // hmmm
                v.then( v => {
                    setter(name, v);
                })
                run_subs(name);
            }
            else
            {
                value[name] = v; // save the output

                // value[name] = fn[name](); // run the dynamic value's function and save the output

                tnode[name] = value[name];

                let t1 = performance.now();
                if (report_lag == -1 || (report_lag && t1-t0 > report_lag)) console.log(`${tag?'['+tag+'] ':''} ${name}`,'took',t1-t0,'ms to complete');

                if (name in watch) console.log(`${tag?'['+tag+'] ':''}[update]`,name,get_vars(name));

                // run any subscriptions to this value
                run_subs(name);
            }
        }

        stack.pop();
    }

    // == get a value ==
    // == can be for static or dynamic values ==

    let getter = (name, parent) => {

        if (deep_log) console.log(`${tag?'['+tag+'] ':''}getting ${name}`,parent?'called by '+parent:'');

        if (fatal.msg)
        {
            if (deep_log) console.log(`${tag?'['+tag+'] ':''}fatal error, not getting ${name}`);
            return;
        }
        if (dynamic_internal.includes(name)) {
            fail(`External read of internal function '${name}'`);
            return;
        }

        if (parent && static_external.includes(name)) {
            fail(`Function '${parent}' tried to access external variable '${name}'`);
            return;
        }

        if (parent) deps[parent][name] = true;

        return value[name];
    }

    // == set a static value ==
    // == should never be a dynamic value ==

    let clear = (name) => {

        if (deep_log) console.log(`${tag?'['+tag+'] ':''}clearing ${name}`);

        Object.keys(deps).forEach( dep =>
            Object.keys(deps[dep]).forEach(child => {
                if (child == name && dep in fn)
                {
                    if (dep in value)
                    {
                        if (count) counts[dep]['clear'] += 1;
                        if (dep in watch) console.log(`${tag?'['+tag+'] ':''}[clear]`,dep,'value cleared because dependency',name,'changed');
                        delete(value[dep]);
                        clear(dep); // not sure if this should be on the outside...
                    }
                }
            })
        )
    }

    let setter = (name, val) => {

        if (deep_log) console.log(`${tag?'['+tag+'] ':''}setting ${name} to`,val);

        if (fatal.msg) return;
        if (!(name in value))
        {
            console.trace(`${tag?'['+tag+'] ':''}ERROR trying to set unknown variable ${name}`);
            fail('outside code trying to set unknown variable '+name);
            return;
        }

        trace = { name, value: val, result: {} }
        tnode = trace.result;

        if (!value[name] && !val) return; // ignore nulls

        // if (val && typeof val.then == 'function') console.log('WARNING: setting a promise as a value');

        if (count && name in counts) counts[name]['setter'] += 1;

        value[name] = val; // save
        // console.log('value[',name,'] =',val);

        if (name in watch) console.log(`${tag?'['+tag+'] ':''}[setter]`,name,'=',value[name],get_vars(name).deps);

        run_subs(name);    // run subscriptions to this value

        clear(name);

        // make sure any dynamic values dependent on this one
        // are updated
        Object.keys(fn).forEach( key => {
            if (!(key in value) && key[0] != '#') update(key,name);
        });

        if (trace_fn) trace_fn(trace);
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

        if (typeof obj[name] != 'function') {
            console.trace(`${tag?'['+tag+'] ':''}EXCEPTION trying to set non-function ${name} as dynamic value`);
        }

        // this is kind of magic
        // each function gets it's own special global object
        // which called getter with it's own name as the parent parameter

        let _ = new Proxy({}, {
            get(target, prop) {
                if (!(prop in value)) {
                    if (prop in fn) update(prop,null,name);
                    else { fail('function '+name+' is trying to access non-existent variable '+prop); return undefined; }
                }
                return getter(prop,name);
            },
            set(target, prop, value) {
                fail('function '+name+' is trying to change value '+prop);
                return true;
            }
        });

        // this is how we would do the above without Proxy.
        // the reason I used Proxy is you can then detect
        // accessing non-existent variable names

        // Object.keys(obj).forEach(
        //     child => Object.defineProperty(_, child, {

        //         // this is the get/set _inside_ a function
        //         get() { return getter(child, name); },
        //         set(v) { fail('function '+name+' is trying to change value '+child);  }

        //     }));

        // here we pass in the specially modified global object to the function
        // and also throw in the set parameter for async functions

        fn[name] = () => {
            if (fatal.msg) return;

            // run the function and catch any error,
            // printing out all the dependent variables if
            // it does

            let v; try { v = obj[name](_, (v) => setter(name, v) ); }
            catch(e) { show_vars(name); if (!fatal.msg) fail({msg:`exception in ${name}`, e}); console.log(e); }

            return v;
        }

        // this is getting the function itself (outside, kind-of)
        Object.defineProperty(res, name, {
            get() { return getter(name) }
        } )
    }

    // setup a static value
    // called from wrap() below

    let setup_static = (name, v, res) => {

        if (typeof v == 'function') {
            console.trace(`${tag?'['+tag+'] ':''}EXCEPTION trying to set function ${name} as static value`);
            return;
        }

        // save whatever was defined originally
        value[name] = v;

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

        console.log(`${tag?'['+tag+'] ':''}FATAL`,_._.fatal.msg);
        console.log(' stack',_._.fatal.stack);
        console.log(' _',_);
        console.log(' (there might be an error below too if your function failed as well)');
    }

    // called once on the root object

    let wrap = (res, hash, obj) => {

        if (deep_log) console.log(`${tag?'['+tag+'] ':''}wrapping object`,obj);

        // add handler that prints out to console for convenience in browser
        // if (!obj['#fatal']) fn['#fatal'] = default_fatal;

        // loop through each key
        Object.keys(obj).forEach(name => {

            // setup dynamic/static
            if (typeof obj[name] == 'function') setup_dynamic (obj, name, res);
            else setup_static (name, obj[name], res);

            // create subscribable object
            setup_sub(hash, name);
        });

        if (typeof obj['#fatal'] === 'function') fn['#fatal'] = obj['#fatal'];
        else fn['#fatal'] = () => default_fatal(res);
    }

    let run_tests = (obj) => {

        if (deep_log) console.log(`${tag?'['+tag+'] ':''}running tests`,tests);

        Object.keys(obj).forEach(name => {
            if (typeof obj[name] == 'function' && name in tests)
            {
                try {
                    let got = obj[name](tests[name]._);
                    let should = tests[name].output;
                    if (JSON.stringify(got) !== JSON.stringify(should)) {
                        console.log(`${tag?'['+tag+'] ':''}WARNING test failed for ${name}`);
                        console.log(' should be',should);
                        console.log(' got',got);
                    }
                }
                catch (e) {
                    console.log(`${tag?'['+tag+'] ':''}EXCEPTION running test for`,name,e);
                }
            }
        })
    }

    // the object we will access from the outside
    // gives access to the internals via _
    // and subscribable versions of each value via '#'

    const res = {                             // return object
        _: { subs, fn, deps, value, fatal },  // so we can see from the outside what's going on
        '#': {},                               // subscribe methods for each member
        v: undefined                            // version number of this lib
    };

    res.add_static = (inner_obj) => {

        Object.keys(inner_obj).forEach(name => {

            setup_static(name, inner_obj[name], res);
            setup_sub(res['#'], name);
        })
    }

    res.add_dynamic = (inner_obj) => {

        Object.keys(inner_obj).forEach(name => {

            setup_dynamic(inner_obj, name, res);
            setup_sub(res['#'], name);
        })

        Object.keys(inner_obj).forEach(name => {
            update(name);
        })
    }

    let add_fn = (inner_obj, fn, arr) => {

        res[fn](inner_obj);
        Object.keys(inner_obj).forEach(name => arr.push(name));

    }

    res.add_static_external = (inner_obj) => add_fn(inner_obj, 'add_static', static_external);
    res.add_static_internal = (inner_obj) => add_fn(inner_obj, 'add_static', static_internal);
    res.add_static_mixed = (inner_obj) => add_fn(inner_obj, 'add_static', static_mixed);

    res.add_dynamic_external = (inner_obj) => add_fn(inner_obj, 'add_dynamic', dynamic_external);
    res.add_dynamic_internal = (inner_obj) => add_fn(inner_obj, 'add_dynamic', dynamic_internal);
    res.add_dynamic_mixed = (inner_obj) => add_fn(inner_obj, 'add_dynamic', dynamic_mixed);

    // first run tests...
    run_tests(obj);

    // do everything
    // run wrap, and run update on all dynamic values

    // this is to detect any bad functions on boot (i.e. functions which refer to a non-existent variable)
    // we set everything to undefined because the check is "name in value"

    wrap(res, res['#'], obj);

    function print_and_reset_counts() {

        let toprint = Object.keys(counts);
        let totals = toprint.map(name => counts[name]['update'] + counts[name]['setter'] + counts[name]['clear']);
        let sorted = totals.map((v,i) => [v, toprint[i]]).sort((a,b) => b[0]-a[0]);
        if (count.top) sorted = sorted.slice(0,count.top);
        if (count.max) sorted = sorted.filter(v => v[0] > count.max);

        const names = sorted.map(v => v[1]);
        console.log(`${tag?'['+tag+'] ':''}[access counts]`,names.map(name => ({ name, counts: counts[name] })));

        counts = {};
        Object.keys(fn).forEach(name => {
            counts[name] = { update: 0, setter: 0, clear: 0 };
        })
    }

    if (count)
    {
        counts = {};
        Object.keys(fn).forEach(name => {
            counts[name] = { update: 0, setter: 0, clear: 0 };
        })
        if (count.repeat) setInterval(print_and_reset_counts, count.interval);
        else setTimeout(print_and_reset_counts, count.interval);
    }

    Object.keys(fn).forEach(name => {
        if (name[0] != '#'){ // TODO need to look into this hash thing... do we use it?
            value[name] = undefined;
            update(name);
        }
    });

    return res;
}