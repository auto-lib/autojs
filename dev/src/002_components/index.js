
let { dynamic, static } = require('./value');
let external = require('./external');

let auto = (obj, opt) => {

    let { cache, pubsub, error } = opt;

    // use defaults if none passed in
    cache = cache || require('./cache')();
    pubsub = pubsub || require('./pubsub')();
    error = error || require('./error')();

    // res just binds external access like _.x = 2
    let res = {};

    Object.keys(obj).forEach(name => {

        let v = obj[name], c = cache(name), ps = pubsub(name), e = error(name);

        if (typeof v === 'function')
            dynamic(v,c,ps,e);
        else
            static(v,c);

        external(res, name, v, c, ps);
    })

    // give access to outside to view internal vars
    // (you can also create the objects yourself
    //  and get the internals from there...)
    res['_'] = () => ({ cache, pubsub, error });
    
    return res;
}

module.exports = auto;