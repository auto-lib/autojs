
// https://stackoverflow.com/a/16608045
let isObject = function(a) { return (!!a) && (a.constructor === Object); };

let keys = o => { if (!isObject(o)) throw 'FATAL not object'; return Object.keys(o); }

let map = (name,value,sig,state) => keys(value).forEach(key => sig(key,value[key]));
let map_to = fn => (name,value,sig,state) => keys(value).forEach(key => fn(key,value[key],sig,state));
let array_to = fn => (name,value,sig,state) => value.forEach(v => fn(name,v,sig,state));
let save = (name,value,sig,state) => state[name] = value;

function process(def,name,value,sig,state,opt)
{
    if (opt.preprocess) opt.preprocess(state,name,value);
    
    if (typeof def[name] === 'function')
    {
        try { def[name](name,value,sig,state); }
        catch (e) { state.onerror(state, e); }
    }
    
    if (opt.postprocess) opt.postprocess(state,name,value);
}

function signal(def,imm,state,opt)
{
    let queue = [];
    let next = [];

    state.booting = true;
    state.onwarn = opt.onwarn ? opt.onwarn : (state,msg) => console.log(msg);
    state.onerror = opt.onerror ? opt.onerror : (state,msg) => console.trace(msg);

    let sig = (name,value) => {

        // not sure this is a good idea
        // v = v.length == 1 ? v[0] : v;

        if (opt.presig) opt.presig(state,name,value);

        if (name in imm)
            return imm[name](sig,state,name,value);
        else if (name in def)
            next.push({ name, value})
        else
            onwarn(state, `no handler for signal '${n}'`);

        if (opt.postsig) opt.postsig(state,name,value);
    };

    return {
        step: () => {

            queue = next; next = [];
            while (queue.length>0)
            {
                let { name, value } = queue.shift();
                process(def,name,value,sig,state,opt);
            }
        },
        sig,
        internal: () => ({ state, next, queue }),
        next
    }
}

export { map, map_to, array_to, save, signal };