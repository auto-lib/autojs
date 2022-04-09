

let update = (boxes,name,cb) => {

    let box = boxes[name];

    if (!box.fn) return;

    let { fn, dirty, cache, pubsub } = box;
    let { clear_subs, subscribe, publish, connect } = pubsub;

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
            subscribe(boxes[n]);
            return boxes[n].cache.get()
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
        subscribe: (box) => subs[box.name] = box,
        clear_subs: () => subs = {}
    }
}

let auto = (obj,cache,pubsub) => {
    let boxes = {};
    Object.keys(obj).forEach(name => boxes[name] = box(name,obj[name],cache(),pubsub()));
    Object.keys(obj).forEach(name => update(boxes,name));
    return boxes;
}

let _ = auto({
    x: 10,
    y: _ => _('x') * 2
}, mem_cache, simple_pubsub)

// console.log(_);
console.log(_.y.cache.get());