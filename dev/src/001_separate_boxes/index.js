
let { dynamic, static } = require('./value');

let make_cache = require('./cache');
let make_pubsub = require('./pubsub');
let make_error = require('./error');

let external = require('./external');

let auto = (obj, opt) => {

    let { cache, pubsub, error } = opt;

    cache = cache || make_cache();
    pubsub = pubsub || make_pubsub();
    error = error || make_error();

    let res = {};

    Object.keys(obj).forEach(name => {

        let v = obj[name], c = cache(name), ps = pubsub(name), e = error(name);

        if (typeof v === 'function')
            dynamic(v,c,ps,e);
        else
            static(v,c);

        external(res, name, v, c, ps);
    })

    res['_'] = () => ({ cache: cache(), deps: pubsub(), error: error() });
    
    return res;
}

module.exports = auto;