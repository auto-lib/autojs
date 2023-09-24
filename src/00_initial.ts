
type Deps = Record<string, Record<string, boolean>>;
type Fn = Record<string, ()=>unknown>;
type Value = Record<string, unknown>;
type Fatal = {
    msg?: string,
    stack?: string[]
};
type Subs = Record<string, ()=>void>;
type Opt = {
    watch?: Record<string, boolean>
}

type Hash = Record<string, ()=>void>;

type Auto = {
    _: { subs: Subs, fn: Fn, deps: Deps, value: Value, fatal: Fatal },
    '#': Hash,
    v: string
}

export function auto(obj?: object, opt?:Opt): Auto {

    const deps:Deps = {};   // list of dependencies (dynamic)
    const fn:Fn = {};     // list of functions (dynamic)
    const value:Value = {};
    const stack:string[] = [];  // list of call stack
    const fatal:Fatal = {};  // only set if fatal error occurs (and everything stops if this is set)
    const subs:Subs = {};   // functions to run each time a value changes (static and dynamic)
    
    let trace = {};
    let tnode = {};

    const watch = opt && 'watch' in opt && opt.watch ? opt.watch : {};

    const fail = (msg:string,stop?:boolean) => { 
        
        // save out to global object
        // so we can access it from outside for debugging
        // and also update uses this to stop looping during a circle

        fatal.msg = msg;
        fatal.stack = stack.map(s => s); // copy out the call stack
        
        // if (!stop && fn['#fatal']) fn['#fatal'](res); // run the function #fatal which is meant for reactions to errors. this should be a subscription so we can have multiple...
    }

    const get_vars = (name:string) => {
        const o = { deps: {}, value: value[name] };
        if (name in deps) 
            Object.keys(deps[name]).forEach( dep => {
                if (!deps[dep]) 
                    o.deps[dep] = value[dep];
                else {
                    o.deps[dep] = { value: value[dep], deps: {} };
                    Object.keys(deps[dep]).forEach(inner => o.deps[dep].deps[inner] = get_vars(inner)); }
            })
        return o;
    }
    const show_vars = (name:string) => console.log('EXCEPTION in '+name,get_vars(name).deps);

    const update = (name:string) => {   

        if (value[name]) return;

        // Object.keys(deps).forEach( child => {
        //     if (name in deps[child] && !(child in value)) update(child);
        // })

        if (fatal.msg) return;

        stack.push(name); // save call stack (for debug messages and circle detection)
        if (stack.indexOf(name)!==stack.length-1) { fail('circular dependency'); return; }

        deps[name] = {}; // clear dependencies for this value
        // let t0 = performance.now();
        value[name] = fn[name](); // run the dynamic value's function and save the output

        // tnode[name] = value[name];

        // let t1 = performance.now();
        // if (report_lag == -1 || (report_lag && t1-t0 > report_lag)) console.log(name,'took',t1-t0,'ms to complete');

        // if (name in watch) console.log(name,get_vars(name));

        // run any subscriptions to this value
        // run_subs(name);

        stack.pop();
    }

    const getter = (name:string, parent?:string) => {

        if (fatal.msg) return;

        if (parent) deps[parent][name] = true;

        return value[name];
    }

    const setter = (name:string, val:unknown) => {

        if (fatal.msg) return;
        if (!(name in value))
        {
            console.trace('ERROR trying to set unknown variable '+name);
            fail('outside code trying to set unknown variable '+name);
            return;
        }

        // trace = { name, value: val, result: {} }
        // tnode = trace.result;
        
        value[name] = val; // save
        // if (name in watch) console.log(name,'=',value[name],get_vars(name).deps);

        // run_subs(name);    // run subscriptions to this value

        // clear(name);

        // make sure any dynamic values dependent on this one
        // are updated
        Object.keys(fn).forEach( key => {
            if (!(key in value) && key[0] != '#') update(key);
        });

        // if (trace_fn) trace_fn(trace);
    }

    const setup_dynamic = (func:(v:unknown, setter?:(v:unknown)=>unknown)=>unknown, name:string, res:Auto) => {

        // this is kind of magic
        // each function gets it's own special global object
        // which called getter with it's own name as the parent parameter

        const _ = new Proxy({}, {
            get(_, prop) {
                const propName = prop.toString(); // convert symbol to string
                if (!(propName in value)) {
                    if (propName in fn) update(propName);
                    else { fail('function '+name+' is trying to access non-existent variable '+propName); return undefined; }
                }
                return getter(propName, name);
            },
            set(_, prop, _value) {
                const propName = prop.toString();
                fail('function '+name+' is trying to change value '+propName); 
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

            let v; try { v = func(_, (v) => setter(name, v) ); }
            catch(e) { show_vars(name); if (!fatal.msg) fail('exception',true); console.log(e); }
            
            return v;
        }
        
        // this is getting the function itself (outside, kind-of)
        Object.defineProperty(res, name, { 
            get() { return getter(name) } 
        } )
    }

    function setup_static(name:string, v:unknown, res:Auto) {

        if (typeof v == 'function') {
            console.trace(`EXCEPTION trying to set function ${String(name)} as static value`);
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
    
    function wrap(res:Auto, _hash:Hash, obj:object) {
    
         Object.keys(obj).forEach(name => {
    
            const v = obj[name as keyof object];

            if (typeof v == 'function') 
                setup_dynamic (v, name, res);
            else
                setup_static (name, v, res);
    
        });
    }
    
    const res = {                             // return object
        _: { subs, fn, deps, value, fatal },  // so we can see from the outside what's going on
        '#': {},                               // subscribe methods for each member
        v: '1.35.41'                            // version number of this lib
    };

    if (obj) wrap(res, res['#'], obj);

    return res;

}