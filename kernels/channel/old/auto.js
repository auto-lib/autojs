
// https://stackoverflow.com/a/16608045
let isObject = function(a) {
    return (!!a) && (a.constructor === Object);
};

// create a unique array of get accesses
function calc_deps(deps,name,fn)
{
    let ctx = deps => new Proxy({}, { get(t,n) { if (deps.indexOf(n)==-1) deps.push(n); } })
    deps[name] = [];
    fn(ctx(deps[name]));
}

function run_and_save_fn(fn, name, cache)
{
    let ctx = new Proxy({}, { get(t,n) { return cache[n]; } })
    cache[name] = fn(ctx);
}

function init_state(name, err, state, deps, cache, imports)
{
    if (!isObject(state)) err('FATAL state is not object:',state);
    else
    {
        // calc deps, save static
        Object.keys(state).forEach(name => {
            let value = state[name];
            if (typeof value === 'function') calc_deps(deps,name,value);
            else cache[name] = value;
        })
        // 1. check if deps = present+inputs
        // 2. if not, error
        // 3. if so, check if deps = present
        // 4. if so, update
        
        Object.keys(state).forEach(member => {
            let value = state[member];
            if (typeof value === 'function')
            {
                let all_in_cache = true;
                deps[member].forEach(dep => {
                    let in_cache = dep in cache;
                    let in_state = dep in state;
                    if (!in_cache) all_in_cache = false;
                    let in_imports = false;
                    if (imports) in_imports = imports.indexOf(dep) > -1;
                    if (!in_state && !in_imports) err('FATAL auto',name,'has function',member,'with dependency',dep,'which is neither local nor imported');
                })

                if (all_in_cache) run_and_save_fn(value, member, cache);
            }
        })
    }
}

function auto(obj)
{
    let name, onerror, state, channels, imports, exports; // comes from obj
    let deps = {}, cache = {}, subs = []; // built up

    if (!obj) console.log('FATAL no object passed into auto');
    else if (!isObject(obj)) console.log('FATAL passed in non-object to auto', opt);
    else
    {
        ({ name, onerror, state, channels, imports, exports } = obj);

        let err = e => console.log('ERROR',e);

        if (typeof onerror !== 'function') console.log('CRITICAL error handler is not function:',onerror);
        else err = onerror;

        if (state) init_state(name, err, state, deps, cache, imports);
    }

    function connect(ch) { 
        channel = ch;
        if (imports) imports.forEach(n => channel.subscribe(name,n, v => set_value(n,v)));
    }

    function sub(n)
    {
        if (typeof name !== 'string') console.log('CRITICAL',name,'cannot subscribe to non-string',n);
        else if (subs.indexOf(n) == -1) subs.push(n)
    }

    function recalculate()
    {
        return;
        state.forEach(member => {
            let value = state[member];
            if (typeof value === 'function')
            {
                let all_in_cache = true;
                deps[member].forEach(dep => {
                    let in_cache = dep in cache;
                    if (!in_cache) all_in_cache = false;
                })
                if (all_in_cache)
                {
                    let ctx = new Proxy({}, { get(t,n) { return cache[n]; } })
                    let v = value(ctx);
                }
            }
        })
    }

    return { 
        internals: () => ({
            name, state, channels, imports, exports,
            deps, cache
        }),
        connect,
        recalculate
    }

}

module.exports = auto;