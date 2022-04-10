

let update = (boxes,name,cb) => {

    let box = boxes[name];

    if (!box.fn) return;

    let { fn, dirty, cache, pubsub } = box;
    let { clear_deps, subscribe, publish, connect } = pubsub;

    let set = (v,sc) => {
        if (sc) cache.save(v); // save the value
        // publish(); // set downstream boxes to dirty
        box.dirty = false;
        if (cb) cb();
    }
    
    if (!fn || !dirty) return cache.get();
    else
    {
        let ctx = (n) => {
            subscribe(n);
            return boxes[n].cache.get()
        }
        clear_deps();
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
    let deps = [];
    return {
        getdeps: () => deps,
        publish: () => Object.values(deps).forEach(dep => dep.dirty == true),
        subscribe: (name) => deps.push(name),
        clear_deps: () => deps = []
    }
}

let make_ = (boxes) => {
    let _ = {
        deps: {},
        value: {},
        fn: [],
        subs: {}
    };
    Object.keys(boxes).forEach(name => {
        update(boxes,name);
        _.deps[name] = boxes[name].pubsub.getdeps();
        _.value[name] = boxes[name].cache.get();
        _.fn.push(boxes[name].fn);
    })
    return _;
}

let auto_ = (obj,cache,pubsub) => {
    let boxes = {};
    Object.keys(obj).forEach(name => boxes[name] = box(name,obj[name],cache(),pubsub()));
    Object.keys(obj).forEach(name => update(boxes,name));
    return make_(boxes);
}

let auto = (obj) => auto_(obj, mem_cache, simple_pubsub);

let _ = auto({
    x: 10,
    y: _ => _('x') * 2
})

console.log(_);
// console.log(_.y.cache.get());