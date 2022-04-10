
let { compare } = require('./compare');

// used to exclude unnamed subs
function remove_hash(obj) {
    let ret = {};
    Object.keys(obj).forEach(name => {
        if (name[0] != '#') ret[name] = obj[name];
    })
    return ret;
}

function check_test(library, name, test)
{
    let _ = library(test.obj);
    
    let global = {};
    test.fn(_,global);

    let pubsub = {};
    
    let a = {
        cache: _['_'].cache.state(),
        pubsub: remove_hash(_['_'].pubsub.state()),
        fatal: _['_'].fatal,
        global
    }

    let b = {
        cache: test.cache,
        pubsub: test.pubsub,
        fatal: test.fatal,
        global: test.global
    }

    let same = compare(a,b);

    if (!same)
    {
        console.log(name,'fail');
        console.log(' - obj',test.obj);
        console.log(' - state auto',a);
        console.log(' - state test',b);
    }
    else
    {
        console.log(name,'ok');
    }

    return same;
}

module.exports = { check_test };