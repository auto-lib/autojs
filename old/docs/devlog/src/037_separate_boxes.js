

let update = (boxes,name,cb) => {

    let box = boxes[name];

    if (!box.fn) return;

    let { fn, dirty, cache, pubsub } = box;
    let { clear_deps, subscribe } = pubsub;

    let set = (v,sc) => {
        if (sc) cache.set(v);
        box.dirty = false;
        if (cb) cb(v);
    }
    
    if (!fn || !dirty) return cache.get();
    else
    {
        let _ = new Proxy({}, {
            get(target, prop) {
                subscribe(prop);
                return boxes[prop].cache.get();
            },
            set(target, prop, value) {
                fail('function '+name+' is trying to change value '+prop); 
            }
        });
        clear_deps();
        set(fn(_,set),true);
    }
}

let box = (name,value,cache,pubsub) => {

    let fn, dirty;
    if (typeof value === 'function') { fn = value; dirty = true; }
    else { cache.set(value); dirty = false; }

    return { name, fn, dirty, cache, pubsub }
}

let mem_cache = () => {
    let value;
    return { set: v => value = v, get: _ => value }
}

let simple_pubsub = () => {
    let deps = {};
    return {
        getdeps: () => deps,
        subscribe: (name) => deps[name] = true,
        clear_deps: () => deps = {}
    }
}

let dirty_deps = (boxes, name) => {

    Object.keys(boxes).forEach(n => {
        if (boxes[n].fn && !boxes[n].dirty && name in boxes[n].pubsub.getdeps()) {
            boxes[n].dirty = true;
            dirty_deps(boxes,n);
        }
    })
}

let dynamic = (_, name, boxes) => {
    _.deps[name] = boxes[name].pubsub.getdeps();
    _.fn[name] = boxes[name].fn;
}

let static = (res, _, name, boxes) => {

    Object.defineProperty(res, name, { 
        get() { return boxes[name].cache.get() }, 
        set(v) { 
            boxes[name].cache.set(v);
            _.value[name] = v;
            dirty_deps(boxes, name);
            Object.keys(boxes).forEach(name => update(boxes,name, (v) => _.value[name] = v))
        } 
    })
}

let make_res = (boxes) => {
    let _ = { deps: {}, value: {}, fn: {}, subs: {} };
    let res = {};
    Object.keys(boxes).forEach(name => {
        _.value[name] = boxes[name].cache.get();
        if (boxes[name].fn) dynamic(_, name, boxes);
        else static(res, _, name, boxes);
    })
    res._ = _;
    return res;
}

let auto_ = (obj,cache,pubsub) => {
    let boxes = {};
    Object.keys(obj).forEach(name => { if (name[0] != '#') boxes[name] = box(name,obj[name],cache(),pubsub()) })
    Object.keys(obj).forEach(name => { if (name[0] != '#') update(boxes,name) })
    return make_res(boxes);
}

let auto = (obj) => auto_(obj, mem_cache, simple_pubsub);
