
let { dynamic, static } = require('./value');
let make_cache = require('./cache');
let make_pubsub = require('./pubsub');
let external = require('./external');

let auto = (obj) => {

    let cache = make_cache();
    let pubsub = make_pubsub();

    let res = {};

    Object.keys(obj).forEach(name => {

        let v = obj[name], c = cache(name), ps = pubsub(name);

        if (typeof v === 'function')
            dynamic(v,c,ps);
        else
            static(v,c,ps);

        external(res, name, v, c, ps);
    })

    res['#'] = { cache, pubsub };
    
    return res;
}

module.exports = auto;