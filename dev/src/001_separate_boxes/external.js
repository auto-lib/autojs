
// define properties on the returned object
// so that we can e.g. _.x = 10 or console.log(_.y)

let dynamic = (name,cache) => 
({
    get() { return cache.get(name) },
    set(v) { fail('someone is trying to set function '+name,stack,fatal) }
})

let static = (name,cache,pubsub) => 
({
    get() { return cache.get(name) }, 
    set(v) {
        cache.set(v); 
        pubsub.trigger();
    }
})

let external = (res, name, v, cache, pubsub) => {

    if (typeof v == 'function')
        Object.defineProperty(res, name, dynamic(name,cache,pubsub));
    else
        Object.defineProperty(res, name, static(name,cache,pubsub));
}

module.exports = external;