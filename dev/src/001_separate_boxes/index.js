
let { dynamic, static } = require('./value');
let make_cache = require('./cache');
let make_pubsub = require('./pubsub');
let make_error = require('./error');
let external = require('./external');

let auto = (obj) => {

    let cache = make_cache();
    let pubsub = make_pubsub();
    let error = make_error();

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