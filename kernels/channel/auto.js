
import { map, map_to, array_to, save, signal } from './signal.js';

let delayed = {
    obj: map,
    name: save,
    imports: save,
    exports: save,
    channels: array_to( (n,v,sig,state) => {
        v.channels[state.name] = {...state,sig};
        state.channels[v.name] = v;
    }),
    state: map_to( (n,v,sig,state) => {
        if (typeof v === 'function')
        {
            state.fn[n] = v;
            state.deps[n] = [];
            sig('run',n);
        }
        else sig('set',{ name:n, value:v })
    }),
    run: (n,v,sig,state) => {
        let name = v;
        let fn = state.fn[name];
        state.deps[name] = [];
        let ctx = new Proxy({},{ 
            get(t,member) { return sig('get', {name: member, parent: name}); },
            set(t,n,v) { state.fatal = {msg:`function ${name} is trying to change ${n}`}}
        });
        let value = fn(ctx);
        sig('set',{ name, value })
    },
    set: (n,v,sig,state) => {
        
        let { cache, deps, exports } = state;

        // save in cache
        let { name, value } = v;
        cache[name] = value;
        
        // run functions
        let to_run = {};
        Object.keys(deps).forEach(fn => { if (deps[fn].indexOf(name)>-1) to_run[fn] = true; })
        Object.keys(to_run).forEach(t => sig('run',t));
    
        // notify channels
        if (exports.indexOf(name)>-1) sig('export', { name, value });
    },
    import: (n,v,sig,state) => {
        let { name, value } = v;
        sig('set', { name, value });
    },
    export: (n,v,sig,state) => {
        let { name, value } = v;
        let { channels } = state;
        Object.keys(channels).forEach(id => {
            if (channels[id].imports.indexOf(name) > -1)
                channels[id].sig('import',{name,value})
        });
    },
    'check circle': (n,v,sig,state) => {
        let stack = [];
        let check = (dep, stack) => {
            if (stack.indexOf(dep)>-1) { 
                stack.push(dep); 
                state.fatal = {msg: 'circular dependency',stack}; 
                return; }
            stack.push(dep);
            if (dep in state.deps) state.deps[dep].forEach(dep => check(dep,stack));
        }
        check(v,stack);
    },
    onerror: null,
    actions: null
}

let immediate = {
    log: (sig,state,n,v) => {
        if (state.name)
        {
            let args = [`[${state.name}]`];
            if (Array.isArray(v)) args.push.apply(args,v);
            else args.push(v);
            console.log.apply(console,args);
        }
        else console.log.apply(console,v);
    },
    get: (sig,state,n,v) => {
        let { name, parent } = v;
        if (state.deps[parent].indexOf(name) == -1 ){
            state.deps[parent].push(name);
            sig('check circle',parent);
        }
        return state.cache[name]
    }
}

function auto(obj,verbose)
{
    let state = {
        fn: {}, 
        cache: {}, 
        deps: {},
        channels: [],
        imports: [],
        exports: [],
        subs: [],
        fatal: null,
        booting: true
    };

    let opt = {
        presig: verbose ? (state,n,v) => console.log(`  [${state.name}]`,n,v) : null,
        poststep: verbose ? (state,next) => console.log('---') : null,
        preprocess: verbose ? (state,n,v) => console.log(`(${state.name})`,n,v) : null,
        onerror: e => { if (!state.booting) console.trace(e); }
    };

    let { step, sig, internal } = signal(delayed,immediate,state,opt);
    
    sig('obj',obj);

    let cleanup = () => {
        let i = 0, limit = 10;
        let stop = false;
        while (internal().next.length>0 && !stop)
        {
            if (internal().state.fatal != null) { 
                // console.log('fatal error',internal().state.fatal,'. stopping.');
                stop = true; return;
            }
            
            if (i==limit) { sig('log',`FAIL step limit (${limit}) reached`); break; }
            i++;
            step();
        }
    }

    cleanup();

    state.booting = false; // don't suppress errors anymore

    // sig('log',`took ${i} steps to finish`);
    // sig('log','next',internal().next);
    // sig('log','state',state);

    // let o = { ...state, sig, internal, step };

    return new Proxy({},{
        get(t,n) {
            if (n === '_') {
                // Return internal state in format expected by tests
                return {
                    fn: Object.keys(state.fn),
                    deps: state.deps,
                    value: state.cache,
                    subs: state.subs,
                    fatal: state.fatal
                };
            }
            if (n === 'internal') return internal;
            if (n === 'flush') return () => {}; // no-op for compatibility
            return state.cache[n];
        },
        set(t,name,value) { sig('set',{name,value}); cleanup(); return true; }
    })
}

export default auto;