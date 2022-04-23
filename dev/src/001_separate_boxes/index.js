
let { dynamic, static } = require('./value');
let external = require('./external');

let auto = (obj, opt) => {

    let { cache, pubsub, error } = opt;

    cache = cache || require('./cache')();
    pubsub = pubsub || require('./pubsub')();
    error = error || require('./error')();

    let res = {};

    Object.keys(obj).forEach(name => {

        let v = obj[name], c = cache(name), ps = pubsub(name), e = error(name);

        if (typeof v === 'function')
            dynamic(v,c,ps,e);
        else
            static(v,c);

        external(res, name, v, c, ps);
    })

    res['_'] = () => ({ cache, pubsub, error });
    
    return res;
}

module.exports = auto;