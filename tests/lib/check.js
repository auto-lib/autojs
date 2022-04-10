
let { compare } = require('./compare');

function check_test(library, name, test)
{
    let _ = library(test.obj);
    
    test.fn(_);

    let a = {
        cache: _['_'].cache.state(),
        pubsub: _['_'].pubsub.state(),
        fatal: _['_'].fatal,
        subs: _['_'].subs
    }

    let b = {
        cache: test.cache,
        pubsub: test.pubsub,
        fatal: test.fatal,
        subs: test.subs
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