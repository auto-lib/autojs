
let { compare } = require('./compare');

function check_test(library, name, test)
{
    let _ = library(test.obj);
    
    test.fn(_);

    let a = {
        cache: _['#'].cache.state(),
        pubsub: _['#'].pubsub.state(),
        fatal: _['#'].fatal
    }

    let b = {
        cache: test.cache,
        pubsub: test.pubsub,
        fatal: test.fatal
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