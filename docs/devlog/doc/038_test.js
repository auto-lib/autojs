

let update = (box,cb) => {

    let { fn, dirty, cache, pubsub } = box;
    let { clear_subs, publish } = pubsub;

    let set = (v,sc) => {
        if (sc) cache.save(v); // save the value
        publish(); // set downstream boxes to dirty
        box.dirty = false;
        if (cb) cb();
    }
    
    if (!fn || !dirty) return cache.get();
    else
    {
        let ctx = (n) => {
            subs.add(n);
            return get(getbox(n), cb);
        }
        clear_subs();
        set(fn(ctx,set),true);
    }
}

let box = (name,value,cache,pubsub) => {

    let fn, dirty;

    if (typeof value === 'function')
    {
        fn = value;
        dirty = true;
    }
    else {
        cache.save(value);
        dirty = false;
    }

    return {
        name, fn, dirty, cache, pubsub
    }
}

let mem_cache = () => {
    let value;
    return {
        save: v => value = v,
        get: _ => value
    }
}

let simple_pubsub = () => {
    let deps = {};
    let subs = {};
    return {
        
        publish: () => Object.values(deps).forEach(dep => dep.dirty == true),
        subcribe: (box) => subs[box.name] = box,
        clear_subs: () => subs = {}
    }
}

let auto = (obj,cache,pubsub) => {
    let boxes = [];
    Object.keys(obj).forEach(name => boxes.push(box(name,obj[name],cache(),pubsub())));
    boxes.forEach(box => update(box));
    return boxes;
}

let _ = auto({
    x: 10,
    y: _ => _.x * 2
}, mem_cache, simple_pubsub)

console.log(_);
console.log(_[1].cache.get());